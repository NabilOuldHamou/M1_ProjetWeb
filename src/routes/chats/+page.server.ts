export async function load({ fetch, locals }) {

	try {
			// Appel API ou récupération de données
		const res = await fetch('/api/channels', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const channels = await res.json();

		// Retourner les données à la page sous forme de props
		return {
			channels,
			userId: locals.userId
		};
	} catch (error) {
		console.error('Erreur lors du chargement des canaux:', error);
		return {
			channels: [],
			userId: locals.userId
		};
	}
}