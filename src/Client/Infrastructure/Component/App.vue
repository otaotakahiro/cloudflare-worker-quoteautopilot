<script lang="ts" setup>

</script>

<template>
  <div id="app" :class="$style.app">
    <header :class="$style.header">
      <h1 :class="$style.title">QuoteAutopilot</h1>
      <p :class="$style.subtitle">請求書から見積もりを自動化</p>
    </header>

    <main :class="$style.main">
      <router-view />
    </main>

    <footer :class="$style.footer">
      <p>&copy; 2024 QuoteAutopilot</p>
    </footer>
  </div>
</template>

<style lang="scss" module>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 2rem;
  text-align: center;
  color: white;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  background: linear-gradient(45deg, #fff, #f0f0f0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.1rem;
  margin: 0;
  opacity: 0.9;
}

.main {
  flex: 1;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.footer {
  background: rgba(0, 0, 0, 0.1);
  padding: 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}
</style>
