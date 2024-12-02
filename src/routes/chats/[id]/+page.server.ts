export async function load({ fetch, params }) {
	try {
		const res = await fetch(`/api/channels/${params.id}/messages?page=1`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}
		const messages = await res.json();
		return {
			messages
		}
	}catch (error) {
		console.error('Erreur lors du chargement des messages:', error);
		return {
			messages: []
		};
	}
}