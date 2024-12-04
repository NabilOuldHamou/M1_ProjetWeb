export async function load({ fetch, params, locals }) {
	try {
		const res = await fetch(`/api/channels/${params.id}/messages?page=1&limit=10`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const messages = await res.json();
		console.log(messages);
		return {
			messages,
			channelId: params.id,
			userId: locals.userId
		}
	}catch (error) {
		console.error('Erreur lors du chargement des messages:', error);
		return {
			messages: [],
			channelId: params.id,
			userId: locals.userId
		};
	}
}