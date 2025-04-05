import { z } from 'zod';

const StudentSchema = z.object({
	id: z.number(),
	firstname: z.string(),
	lastname: z.string(),
	sex: z.string(),
	classId: z.number(),
	birthday: z.string(),
	isFullAged: z.boolean().nullable(),
});
const UserSchema = z.object({
	email: z.string(),
	username: z.string().nullable(),
	localUsername: z.string().nullable(),
	logodidactUsername: z.string().nullable(),
	id: z.number(),
	hasAdministratorRights: z.boolean(),
	roles: z.array(z.string()).nullable(),
	firstname: z.string(),
	lastname: z.string(),
	institutionId: z.number(),
	associatedTeachers: z.array(z.any()),
	associatedStudent: StudentSchema.nullable(),
	associatedParents: z.array(z.any()),
});

const LoginResponseSchema = z.object({
	user: UserSchema,
	jwt: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export default async function fetchLogin(username: string, password: string) {
	const url = 'https://login.schulmanager-online.de/api/login';
	const options = {
		method: 'POST',
		headers: {
			accept: 'application/json, text/plain, */*',
			'content-type': 'application/json',
			origin: 'https://login.schulmanager-online.de',
			referer: 'https://login.schulmanager-online.de/',
		},
		body: `{"emailOrUsername":"${username}","password":"${password}","mobileApp":false,"institutionId":null}`,
	};
	console.log('Login URL:', url);
	console.log('Login Options:', options);
	try {
		const response = await fetch(url, options);
		console.log('Response:', response);
		const data = await response.json();
		const parsedData = LoginResponseSchema.parse(data);
		return parsedData;
	} catch (error) {
		console.error(error);
	}
}
