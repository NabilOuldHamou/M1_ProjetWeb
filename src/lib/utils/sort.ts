export function sortChannels(channels) {
	channels = channels.map((channel) => {
		return {
			...channel,
			lastUpdate : channel.lastMessage != null ? channel.lastMessage.createdAt : channel.createdAt
		};
	});

	return channels.sort((a, b) => {
		return new Date(b.lastUpdate) - new Date(a.lastUpdate);
	});
}