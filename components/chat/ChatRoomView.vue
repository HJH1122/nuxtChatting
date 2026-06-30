<template>
  <div class="chat-container flex flex-col h-[80vh]">
    <!-- Header & User Info -->
    <header class="p-4 border-b bg-gray-50 shadow-sm">
      <h1 class="text-xl font-bold">{{ roomName }}</h1>
      <div v-if="onlineUsers.length > 0" class="text-sm text-gray-600 mt-1">
        접속자: {{ onlineUsers.join(', ') }} (총 {{ onlineUsers.length }}명)
        <!-- TODO: Display Room Admin/Crown Status Here -->
      </div>
    </header>

    <!-- Chat Message Area (Infinite Scroll Target) -->
    <div ref="messageScrollContainer" class="flex-grow p-4 overflow-y-auto custom-scrollbar">
      <div v-for="(msg, index) in chatHistory" :key="msg.id || index"
           :class="['mb-3', msg.isLive ? 'animate-fade-in' : '', (msg.senderId === localUserId ? 'text-right' : 'text-left')]"
           @click="scrollToMessage(index)">
        <div v-if="!msg.id" class="opacity-70 text-gray-500">⚠️ 임시 메시지 로드 중...</div>
        <div v-else class="max-w-3xl p-2 rounded-lg shadow-sm" :class="{ 'bg-blue-100 border-l-4 border-blue-500': msg.isLive, 'border border-gray-200': !msg.isLive }">
          <div class="flex justify-between items-center text-xs mb-1">
            <span :class="['font-semibold', (msg.senderId === localUserId ? 'text-blue-700' : 'text-gray-800')]">
              {{ formatSender(msg.senderName, msg.senderId) }}
            </span>
            <span>{{ formatTime(msg.createdAt) }}</span>
          </div>
          <div v-html="formatContent(msg.content)"></div>
        </div>
      </div>

      <!-- Loading Indicator for Infinite Scroll -->
      <div v-if="isLoading" class="text-center py-4 text-gray-500">
        과거 채팅 이력을 불러오는 중...
      </div>
    </div>

    <!-- Message Input Area -->
    <footer class="p-4 border-t bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.1)] sticky bottom-0">
        <div class="flex gap-3">
            <input
                v-model="messageContent"
                @keyup.enter="sendMessageFromInput"
                type="text"
                placeholder="메시지를 입력하고 Enter 키를 누르세요..."
                :disabled="isLoading"
                class="flex-grow p-3 border rounded-full focus:ring-blue-500 focus:border-blue-500 transition duration-150 disabled:bg-gray-100"
            />
            <button
                @click="sendMessageFromInput"
                :disabled="!messageContent.trim() || isLoading"
                class="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 transition duration-150 flex items-center">
                전송 🚀
            </button>
        </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
// 임포트: useSocket Composable을 사용합니다.
import { useSocket } from '@/composables/useSocket';
// 임포트: API 호출용 로직 (예시)

const props = defineProps({
    roomId: { type: String, required: true },
});

// --- State Initialization ---
const { chatHistory, onlineUsers, isLoading, sendMessage, loadInitialHistory, currentRoomId } = useSocket(props.roomId);
const messageContent = ref('');
const localUserId = 'current-user-id'; // TODO: Auth Context에서 실제 사용자 ID를 가져와야 함

// --- Lifecycle Hooks ---

// 1. 초기 로딩 시점: 채팅 히스토리 불러오기
onMounted(async () => {
    await loadInitialHistory({ roomId: props.roomId });
});


// 2. 메시지 전송 핸들러
const sendMessageFromInput = async () => {
    const content = messageContent.value;
    if (!content || isLoading.value) return;

    // Composable의 sendMessage 함수 호출 (이 내부에서 소켓 방출 -> DB 저장 & 브로드캐스트가 일어남)
    await sendMessage(content);

    messageContent.value = ''; // 입력창 초기화
};


// --- Helper Functions ---

const formatSender = (name, id) => {
    const displayName = name || '알 수 없음';
    if (!id) return displayName;
    const truncatedId = id.length > 8 ? `${id.substring(0, 6)}...` : id;
    return `${displayName}(${truncatedId})`;
};

const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

const escapeHtml = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const formatContent = (content) => {
    // ⭐️ CLAUDE.md 구현 필수 요소: Markdown/Link Preview 처리 로직이 여기에 들어가야 함
    if (!content) return '';
    // Simple markdown parsing mock for demo purposes
    return content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="bg-gray-50 p-3 rounded-md overflow-x-auto text-sm"><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
    });
};

const scrollToMessage = (index) => {
    // 스크롤 위치를 해당 메시지 요소로 이동시키는 로직 구현
    document.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ behavior: 'smooth' });
};

// watchEffect(() => { /* TODO: Auto scroll to bottom on history update */ }, [...chatHistory]);

</script>

<style scoped>
/* Global CSS required for better UX */
.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>