/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import ical, { ICalAttendeeData, ICalCategory, ICalEventClass, ICalEventStatus } from 'ical-generator';
import fetchLogin from './login';
import moment from 'moment';
import fetchTimes, { TimeSchema } from './times';
import fetchTimetable, { Lession, Teacher } from './timetable';

function TimeMap(time: TimeSchema[]) {
	const timeMap = new Map<number, TimeSchema>();
	time.forEach((time) => {
		timeMap.set(time.id, time);
	});
	return timeMap;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const params = new URL(request.url).searchParams;
		const username = params.get('username');
		const password = params.get('password');
		console.log('Username:', username);
		console.log('Password:', password);

		if (!username || !password) {
			return new Response('Missing username or password', { status: 400 });
		}
		// Fetch the JWT token
		const login = await fetchLogin(username, password);
		if (!login) return new Response('Login failed', { status: 401 });
		const jwt = login.jwt;
		const studentId = login.user.associatedStudent?.id;
		if (!studentId) return new Response('Student ID not found', { status: 401 });

		const start = moment().subtract(2, 'week').startOf('week').format('YYYY-MM-DD');
		const end = moment().add(2, 'week').endOf('week').format('YYYY-MM-DD');

		const Times = await fetchTimes(jwt);
		const Timemap = TimeMap(Times?.results[0]?.data || []);
		if (!Timemap) return new Response('Failed to fetch times', { status: 500 });

		const Timetable = await fetchTimetable(jwt, studentId, start, end);
		if (!Timetable) return new Response('Failed to fetch lessons', { status: 500 });

		const calendar = ical({ name: 'My Cloudflare Calendar' });
		const category = new ICalCategory({
			name: 'Schulmanager',
		});
		Timetable.results[0].data.forEach((lesson) => {
			const startTime = moment(lesson.date).startOf('day').add(Timemap.get(lesson.classHour.id)?.from, 'minutes');
			const endTime = moment(lesson.date).startOf('day').add(Timemap.get(lesson.classHour.id)?.until, 'minutes');

			calendar.createEvent({
				start: startTime.toDate(),
				end: endTime.toDate(),
				class: lesson.type === 'changedLesson' ? ICalEventClass.PRIVATE : ICalEventClass.CONFIDENTIAL,
				summary:
					(lesson.type === 'changedLesson' ? '(Changed) ' : lesson.type === 'cancelledLesson' ? '(Cancelled) ' : '') +
					formatSubject(lesson),
				attendees: formatTeachers(lesson),
				organizer: {
					email: `${lesson.actualLesson?.teachers[0].firstname} ${lesson.actualLesson?.teachers[0].lastname}`,
					name: `${lesson.actualLesson?.teachers[0].firstname} ${lesson.actualLesson?.teachers[0].lastname}`,
				},
				location: formatRoom(lesson),
				categories: [category],
				status:
					lesson.type === 'changedLesson'
						? ICalEventStatus.TENTATIVE
						: lesson.type === 'cancelledLesson'
						? ICalEventStatus.CANCELLED
						: ICalEventStatus.CONFIRMED,
			});
		});

		return new Response(calendar.toString(), {
			headers: {
				'Content-Type': 'text/calendar',
				'Cache-Control': 'no-cache',
				'Content-Disposition': 'inline; filename="calendar.ics"',
			},
		});
	},
} satisfies ExportedHandler<Env>;

function formatSubject(lession: Lession) {
	const actualSubject = lession.actualLesson?.subjectLabel || 'No subject assigned';
	const originalSubject = lession.originalLessons?.map((lesson) => lesson.subjectLabel).join(', ') || 'No subject assigned';
	if (
		lession.type === 'changedLesson' &&
		lession.originalLessons &&
		lession.originalLessons.length > 0 &&
		lession.originalLessons[0]?.subject &&
		lession.actualLesson?.subject.id !== lession.originalLessons[0].subject.id
	) {
		return `${originalSubject} -> ${actualSubject}`;
	}

	return actualSubject;
}

function formatTeachers(lession: Lession) {
	const output: ICalAttendeeData[] = [];

	lession.actualLesson?.teachers.map((attendee) => {
		output.push({
			email: 'email',
			name: `${attendee.firstname} ${attendee.lastname}`,
		});
	});

	if (
		lession.type === 'changedLesson' &&
		lession.originalLessons &&
		lession.originalLessons.length > 0 &&
		lession.originalLessons[0]?.teachers &&
		lession.actualLesson?.teachers !== lession.originalLessons[0].teachers
	) {
		lession.originalLessons[0].teachers.map((attendee) => {
			output.push({
				email: 'email',
				name: `normalerweise: ${attendee.firstname} ${attendee.lastname}`,
			});
		});
	}
	return output;
}

function formatRoom(lession: Lession) {
	const actualRoom = lession.actualLesson?.room.name || 'No room assigned';
	const originalRooms = lession.originalLessons?.map((lesson) => lesson.room.name).join(', ') || 'No room assigned';
	if (
		lession.type === 'changedLesson' &&
		lession.originalLessons &&
		lession.originalLessons.length > 0 &&
		lession.originalLessons[0]?.room &&
		lession.actualLesson?.room.id !== lession.originalLessons[0].room.id
	) {
		return `${originalRooms} -> ${actualRoom}`;
	}
	return actualRoom;
}
