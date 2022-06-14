<template>
  <div>
    <div>
      <router-link to="/fixed-secret">固定id,和固定秘钥</router-link>
      <br>
      <router-link to="/async-secret">异步获取id和秘钥、异步获取临时id和临时秘钥和临时token</router-link>
      <br>
      <router-link to="/custom-upload">自定义上传</router-link>
      <hr>
    </div>
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  created() {

  }
}
</script>

<style scoped>

</style>
