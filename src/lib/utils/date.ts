export function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false, // format 24 heures
	});
}

//fonction qui renvoie le temps depuis la créetion du message à maintenant en fonction du temps on affichera le temps en secondes, minutes, heures, jours, semaines, mois, années
export function formatDistanceToNow(dateString) {
	const date = new Date(dateString);
	const now = new Date();
	const diff = now - date;

	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) {
		return `${seconds} s`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} min`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} h`;
	}

	const days = Math.floor(hours / 24);
	if (days < 7) {
		return `${days} j`;
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks} sem`;
	}

	const months = Math.floor(days / 30);
	if (months < 12) {
		return `${months} mois`;
	}

	const years = Math.floor(months / 12);
	return `${years} ans`;
}