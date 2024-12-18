export async function load({ fetch, locals }) {

	try {
		// Appel API ou récupération de données
		const res = await fetch(`/api/users/${locals.userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const user = await res.json();

		// Retourner les données à la page sous forme de props
		return {
			user
		};
	} catch (error) {
		console.error('Erreur lors du chargement des canaux:', error);
		return {
			user : null
		};
	}
}