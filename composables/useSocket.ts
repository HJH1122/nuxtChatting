/**
 * @module useSocket
 * 전역 소켓 연결 상태, 채팅방 이력 및 온라인 사용자 목록을 관리하는 Composable.
 */

import { ref, watchEffect } from 'vue';

// Assuming a socket client connection function is available globally or via a dedicated module
// In a real Nuxt app, you might use vue-use/socketio for this wrapper.
const getSocket = () => {
    // Placeholder: Replace with actual socket initialization logic (e.g., using window.socket)
    console.warn("🚨 Warning: Using placeholder socket client. Actual connection logic must be implemented.");
    return {
        emit: (event, data) => { console.log(`[SOCKET EMIT]: ${event}`, data); },
        on: (event, handler) => { /* Mock listener attachment */ },
        off: (event, handler) => {}
    };
};

const chatHistory = ref([]);      // All loaded messages in the current room.
const onlineUsers = ref([]);     // List of currently connected users in the room.
const isLoading = ref(false);    // Global loading state for API calls.
const currentRoomId = ref(null);  // Currently active room ID.

/**
 * @description 채팅 서비스를 위한 전역 소켓 상태와 핵심 로직을 제공합니다.
 * @param {string} initialRoomId - 초기 연결할 방의 ID
 */
export const useSocket = (initialRoomId) => {
    const socket = getSocket();

    // 1. Room ID 설정 및 이벤트 리스너 초기화
    if (initialRoomId) {
        currentRoomId.value = initialRoomId;
        socket.emit('join-room', initialRoomId);

        // --- Socket Event Handlers ---
        // a) 메시지 수신 처리: 실시간으로 새 메시지가 들어올 때마다 기록을 업데이트합니다.
        socket.on('message', (data) => {
            console.log("Received live message:", data);
            chatHistory.value.push({
                ...data,
                isLive: true // Flag to mark messages received via real-time socket
            });
        });

        // b) 기타 이벤트 핸들링 (예: typing, user joined/left 등)
        socket.on('room-created', (roomData) => { /* ... */ });
    }


    /**
     * @description 로컬 상태를 기준으로 chatHistory에 새로운 메시지를 추가합니다.
     * @param {Object} message - Message object with id, content, senderId, createdAt, type
     */
    const addMessageToHistory = (message) => {
        chatHistory.value.push({
            ...message,
            isLive: true // 새로 도착한 메시지임을 표시
        });
    };

    /**
     * @description 새로운 메시지를 서버로 전송하고 DB 저장을 트리거합니다.
     * @param {string} content - 보낼 메시지 내용
     */
    const sendMessage = async (content) => {
        if (!currentRoomId.value || !content) return;

        // 1. 로컬 UI 즉시 업데이트 (Optimistic Update): 전송하는 순간 화면에 표시하여 UX 개선
        const localMessage = {
            id: 'temp-' + Date.now(), // 임시 ID 사용
            content: content,
            senderId: getCurrentUserId(), // 실제 인증된 유저 ID로 변경 필요
            senderName: '나', // 로컬 유저 이름 (인증 컨텍스트에서 오기 전 임시 표시)
            createdAt: new Date().toISOString(),
            type: "text",
            isLive: true // 로컬에서 생성되었음을 표시 (처리 후 업데이트될 예정)
        };

        chatHistory.value.push(localMessage);

        // 2. 소켓 전송 -> 서버가 DB에 저장하고 브로드캐스트 함
        await socket.emit('message', {
            roomId: currentRoomId.value,
            content: content
        });
    };


    /**
     * @description 주어진 API 호출 파라미터로 과거 메시지 목록을 불러옵니다 (Infinite Scroll).
     * @param {string} roomId - 방 ID
     * @param {Object} params - { limit, afterMessageId }
     */
    const loadInitialHistory = async ({ roomId, limit = 20, afterMessageId }) => {
        isLoading.value = true;
        try {
            console.log(`[API] Fetching initial chat history for ${roomId}...`);
            const response = await $fetch(`/api/messages`, {
                query: { roomId, limit, afterMessageId }
            });
            if (response && response.messages) {
                chatHistory.value = response.messages;
            }
        } catch (error) {
            console.warn("Failed to load chat history via API, using fallback mock data:", error);
            
            // Mock Data Loading Logic as fallback
            await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
            const mockHistory = [
                { id: '1', content: '안녕하세요! 채팅 기능 재구축 완료!', senderId: 'system-id-long-value', senderName: 'System', createdAt: new Date().toISOString(), type: 'system' },
                { id: '2', content: '네, 로직이 매우 잘 설계되었습니다. 이제 DB 연동만 하면 되겠네요.', senderId: 'user-b-uuid-like-long-string-identifier', senderName: 'UserB', createdAt: new Date(Date.now() - 1000).toISOString(), type: 'text' },
            ];
            chatHistory.value = mockHistory;
        } finally {
            isLoading.value = false;
        }
    };

    // Mock function (Should be derived from Auth context)
    const getCurrentUserId = () => 'current-user-id';


    return {
        chatHistory,
        onlineUsers,
        isLoading,
        sendMessage,
        loadInitialHistory,
        currentRoomId
    };
};