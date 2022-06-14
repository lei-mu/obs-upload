<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>
<script>
export default {

  computed: {
    routerKey() {
      console.log(this.$route.fullPath + '-fssssssss')
      return this.$route.fullPath
    }
  },

}
</script>
<style lang="scss">
@import "~@/styles/common";
</style>
