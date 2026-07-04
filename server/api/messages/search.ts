import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
    const { roomId, q } = getQuery(event) as { roomId?: string, q?: string };

    if (!roomId) {
        throw createError({ statusCode: 400, statusMessage: 'Room ID is required.' });
    }

    if (!q || !q.trim()) {
        return { messages: [], count: 0 };
    }

    try {
        const queryMessages = await prisma.message.findMany({
            where: {
                roomId: roomId,
                content: {
                    contains: q.trim(),
                    mode: 'insensitive'
                }
            },
            orderBy: {
                createdAt: 'asc'
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
            }
        });

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
        }));

        return {
            messages: messages,
            count: queryMessages.length
        };

    } catch (error) {
        console.error("Error searching messages:", error);
        throw createError({ statusCode: 500, statusMessage: 'Failed to search messages from the database.' });
    }
});
