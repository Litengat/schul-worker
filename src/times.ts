import { z } from 'zod';

const timeSchema = z.object({
	id: z.number(),
	number: z.string(),
	from: z.string(),
	until: z.string(),
	fromByDay: z.array(z.string()).length(7),
	untilByDay: z.array(z.string()).length(7),
});

const resultSchema = z.object({
	status: z.literal(200),
	data: z.array(timeSchema),
});

const time = z.object({
	results: z.array(resultSchema),
	systemStatusMessages: z.array(z.any()),
});

export type TimeSchema = z.infer<typeof timeSchema>;
export type ResultSchema = z.infer<typeof resultSchema>;
export type Time = z.infer<typeof time>;

export default async function fetchTimes(jwt: string) {
	const url = 'https://login.schulmanager-online.de/api/calls';
	const options = {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${jwt}`,
			accept: 'application/json, text/plain, */*',
			'content-type': 'application/json',
			origin: 'https://login.schulmanager-online.de',
		},
		body: '{"bundleVersion":"823ec1610e","requests":[{"moduleName":"schedules","endpointName":"get-class-hours"}]}',
	};

	try {
		const response = await fetch(url, options);
		const data = await response.json();
		const parsedData = time.parse(data);
		return parsedData;
	} catch (error) {
		console.error(error);
	}
}
