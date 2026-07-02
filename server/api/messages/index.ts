import prisma from '../../utils/prisma'

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
            include: {
                sender: true,
                poll: {
                    include: {
                        options: {
                            include: {
                                votes: true
                            }
                        }
                    }
                }
            },
            take: limit > 0 ? Number(limit) : undefined,
            skip: afterMessageId ? 1 : undefined, // Simple approach: skip 1 if cursor is provided (Needs refinement for true cursor logic)
        });

        // Transform the records into a client-friendly format
        const messages = queryMessages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender.name,
            createdAt: msg.createdAt.toISOString(),
            type: msg.type,
            attachment: msg.attachmentUrl ? {
                name: msg.attachmentName || '',
                url: msg.attachmentUrl,
                type: msg.attachmentType || '',
                size: msg.attachmentSize || undefined
            } : undefined,
            poll: msg.poll ? {
                id: msg.poll.id,
                question: msg.poll.question,
                options: msg.poll.options.map(opt => ({
                    id: opt.id,
                    text: opt.text,
                    votes: opt.votes.length,
                    voters: opt.votes.map(v => v.userId)
                })),
                totalVotes: msg.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0)
            } : undefined
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