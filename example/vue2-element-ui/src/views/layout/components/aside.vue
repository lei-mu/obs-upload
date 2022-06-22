<template>
  <div>
    <el-menu class="" :default-active="defaultActive" @select="menuClick" :default-openeds="allIndex">
      <template v-for="item in menuData">
        <el-submenu :index="item.path" :key="item.id" v-if="item.children">
          <template slot="title">{{ item.title }}</template>
          <el-menu-item :index="list.path" v-for="list in item.children" :key="list.id">{{ list.title }}</el-menu-item>
        </el-submenu>
        <el-menu-item :index="item.path" :key="item.id" v-else>
          <i class="el-icon-setting"></i>
          <span slot="title">{{ item.title }}</span>
        </el-menu-item>
      </template>

    </el-menu>
  </div>
</template>
<script>
export default {
  data() {
    return {
      defaultActive: this.$route.path,
      menuData: [
        {
          id: '1',
          title: '基础展示',
          path: '/34',
          children: [
            {
              id: '1-1',
              path: '/fixed-secret',
              title: '固定id,和固定秘钥',
            },
            {
              id: '1-2',
              path: '/async-secret',
              title: '异步获取ak,sk',
            },
            {
              id: '1-3',
              path: '/custom-upload',
              title: '自定义上传',
            },
          ]
        }]
    }
  },
  computed: {
    allIndex() {
      return this.menuData.reduce((pre, cur) => {
        const filed = 'path'
        console.log(pre, cur);
        pre.push(cur[filed])
        if (cur.children) {
          const childrenIndex = cur.children.reduce((chPre, chCur) => {
            chPre.push(chCur[filed])
            return chPre
          }, [])
          pre = pre.concat(childrenIndex)
        }
        return pre
      }, [])
    }
  },
  methods: {
    menuClick(data) {
      this.$router.push(data)
    }
  }
}

</script>
