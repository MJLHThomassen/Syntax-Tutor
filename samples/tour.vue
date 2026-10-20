<!-- A small tour of a Vue single-file component. Hover anything: the template is
     HTML plus Vue, the script TypeScript, the style CSS. -->
<template>
  <section class="todos">
    <h1 :title="heading">{{ heading.toUpperCase() }} ({{ remaining }} left)</h1>
    <form @submit.prevent="add">
      <input v-model.trim="draft" placeholder="What needs doing?">
      <button type="submit" :disabled="!draft">Add</button>
    </form>
    <ul v-if="todos.length > 0">
      <li v-for="(todo, index) in todos" :key="todo.id" :class="{ done: todo.done }">
        <input type="checkbox" v-model="todo.done">
        {{ index + 1 }}. {{ todo.text }}
        <TodoActions :todo="todo" @remove="remove(todo.id)">
          <template #label="{ text }">{{ text }}</template>
        </TodoActions>
      </li>
    </ul>
    <p v-else-if="loading">Loading…</p>
    <p v-else>Nothing to do!</p>
    <Transition name="fade"><p v-show="saved">Saved</p></Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import TodoActions from './TodoActions.vue';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const heading = 'My todos';
const draft = ref('');
const loading = ref(false);
const saved = ref(false);
const todos = ref<Todo[]>([]);
const remaining = computed(() => todos.value.filter((t) => !t.done).length);

function add() {
  if (!draft.value) return;
  todos.value.push({ id: Date.now(), text: draft.value, done: false });
  draft.value = '';
}

function remove(id: number) {
  todos.value = todos.value.filter((t) => t.id !== id);
}
</script>

<style scoped>
.todos { max-width: 40rem; margin: 0 auto; }
li.done { text-decoration: line-through; opacity: 0.6; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
