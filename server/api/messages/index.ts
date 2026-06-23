/** @type {import('h3').EventHandler<any>} */
export default defineEventHandler(async (event) => {
    const { roomId, limit = 20, afterMessageId } = getQuery(event);

    if (!roomId) {
        throw createError({ statusCode: 400, statusMessage: 'Room ID is required.' });
    }

    try {
        // Use Prisma to fetch messages with cursor-based pagination (Infinite Scroll)
        const queryMessages = await prisma.message.findMany({
            where: {
                roomId: roomId,
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit > 0 ? limit : undefined,
            skip: afterMessageId ? 1 : undefined, // Simple approach: skip 1 if cursor is provided (Needs refinement for true cursor logic)
        });

        // Transform the records into a client-friendly format
        const messages = queryMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            createdAt: msg.createdAt.toISOString(),
            type: msg.type,
        })).reverse(); // Reverse to show chronological order

        return {
            messages: messages,
            count: queryMessages.length,
            hasMore: queryMessages.length === limit // Simple heuristic for 'has more'
        };

    } catch (error) {
        console.error("Error fetching chat history:", error);
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch messages from the database.' });
    }
});