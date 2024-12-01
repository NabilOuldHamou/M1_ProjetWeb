export async function load({ fetch }) {
	try {
			// Appel API ou récupération de données
		const res = await fetch('/api/canals', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const channels = await res.json();

		// Retourner les données à la page sous forme de props
		return {
			channels
		};
	} catch (error) {
		console.error('Erreur lors du chargement des canaux:', error);
		return {
			channels: []
		};
	}
}