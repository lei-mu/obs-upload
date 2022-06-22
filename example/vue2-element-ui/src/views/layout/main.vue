<template>
  <div>
    <el-container class="layout-main-content">
      <el-header class="layout-header">Header</el-header>
      <el-container>
        <el-aside width="200px" class="layout-aside">
          <Aside></Aside> 
        </el-aside>
        <el-main class="layout-main"> <router-view></router-view></el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
import {defineComponent} from 'vue'
export default {
  components: {
    Aside: () => import('./components/aside')
  },
  created() {},
};
</script>

<style scoped lang="scss">
.layout-main-content{
  min-height: 100vh;
}
.layout-header{
  background-color: #fff;
}
.layout-aside{
  background-color: #fff;
}
.layout-main{
  margin: 15px;
  background-color: #fff;
}
</style>
