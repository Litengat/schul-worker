import z from 'zod';

export const classHour = z.object({
	id: z.number(),
	number: z.string(),
});

export const room = z.object({
	id: z.number(),
	name: z.string(),
});

export const subject = z.object({
	id: z.number(),
	abbreviation: z.string(),
	name: z.string(),
	isPseudoSubject: z.boolean(),
});

export const classe = z.object({
	id: z.number(),
	name: z.string(),
});

export const teacher = z.object({
	id: z.number(),
	abbreviation: z.string(),
	firstname: z.string(),
	lastname: z.string(),
});

export const studentGroups = z.object({
	id: z.number(),
	name: z.string(),
	classId: z.number().nullable(),
});

export const actualLesson = z.object({
	room: room,
	subject: subject,
	teachers: z.array(teacher),
	subjectLabel: z.string(),
	studentGroups: z.array(studentGroups),
	classes: z.array(classe),
	lessonId: z.number().optional(),
	courseId: z.number().optional(),
});

export const Lession = z.object({
	date: z.string().date(),
	classHour: classHour,
	type: z.enum(['regularLesson', 'cancelledLesson', 'changedLesson', 'event']),
	actualLesson: actualLesson.optional(),
	originalLessons: z.array(actualLesson).optional(),
	isSubstitution: z.boolean().optional(),
	isNew: z.boolean().optional(),
});
export const event = z.object({
	text: z.string(),
	teachers: z.array(teacher),
	classes: z.array(classe),
	rooms: z.array(room),
	studentGroups: z.array(studentGroups),
	absenceId: z.number().optional(),
});

export const LessionWithEvent = z.object({
	date: z.string().date(),
	classHour: classHour,
	type: z.enum(['regularLesson', 'cancelledLesson', 'changedLesson', 'event']),
	actualLesson: actualLesson.optional(),
	originalLessons: z.array(actualLesson).optional(),
	isSubstitution: z.boolean().optional(),
	isNew: z.boolean().optional(),
	event: event.optional(),
});

export const timetableScema = z.object({
	results: z.array(
		z.object({
			status: z.number(),
			data: z.array(Lession),
		})
	),
});

export type ClassHour = z.infer<typeof classHour>;
export type Room = z.infer<typeof room>;
export type Subject = z.infer<typeof subject>;
export type Classe = z.infer<typeof classe>;
export type Teacher = z.infer<typeof teacher>;
export type StudentGroups = z.infer<typeof studentGroups>;
export type ActualLesson = z.infer<typeof actualLesson>;
export type Lession = z.infer<typeof Lession>;
export type TimetableScema = z.infer<typeof timetableScema>;

export default async function fetchTimetable(jwt: string, studentId: number, start: string, end: string) {
	const url = 'https://login.schulmanager-online.de/api/calls';
	const options = {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			accept: 'application/json, text/plain, */*',
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			bundleVersion: 'b413412dfd',
			requests: [
				{
					moduleName: 'schedules',
					endpointName: 'get-actual-lessons',
					parameters: { student: { id: studentId }, start: start, end: end },
				},
			],
		}),
	};

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		const parsedData = timetableScema.parse(data);
		return parsedData;
	} catch (error) {
		console.error(error);
	}
}
