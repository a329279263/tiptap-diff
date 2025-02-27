<template>
  <el-dialog :fullscreen="true" :visible.sync="visible" @close="close">

    <el-form label-width="90px" label-position="top">

      <el-form-item label="a版本">
        <TipTapDiffEditor ref="current"/>
      </el-form-item>

      <el-form-item label="b版本">
        <TipTapDiffEditor ref="compare"/>
      </el-form-item>

      <el-form-item label="开始对比">
        <el-button @click="startCompare">开始对比</el-button>
      </el-form-item>

      <span v-if="isDataLoaded">
        <el-form-item label="内容简介">
          <template slot="label">
            <span class="content-label">内容简介：</span>
          </template>
          <TipTapDiffEditor ref="diffEditor"/>
        </el-form-item>
      </span>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import TipTapDiffEditor from '@/components/tiptap/TipTapDiffEditor.vue'

export default {
  name: 'CompareDialog',
  components: { TipTapDiffEditor },
  data () {
    return {
      visible: false,
      isDataLoaded: false,
      currentVersion: {},
      compareVersionData: {}
    }
  },
  methods: {
    open () {
      this.simulateComparison()
    },
    close () {
      this.visible = false
    },
    startCompare () {
      let a=this.$refs.current.getJSONstringify()
      let b=this.$refs.compare.getJSONstringify()
      this.$refs.diffEditor.setContents(a, b)
    },
    async simulateComparison () {
      this.visible = true
      this.isDataLoaded = false

      // 模拟数据
      const currentVersion = {
        version: '1.0',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"53252"}]},{"type":"paragraph","content":[{"type":"text","text":"123"}]},{"type":"paragraph","content":[{"type":"image","attrs":{"width":"236px","height":"76px","src":"https://t7.baidu.com/it/u=1956604245,3662848045&fm=193&f=GIF","alt":"","title":null}}]},{"type":"paragraph","content":[{"type":"image","attrs":{"width":"336px","height":"176px","src":"https://t7.baidu.com/it/u=1956604245,3662848045&fm=193&f=GIF","alt":"","title":null}}]}]}\n',
      }

      const compareVersionData = {
        version: '2.0',
        content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"image","attrs":{"width":"","height":"","src":"https://t7.baidu.com/it/u=1595072465,3644073269&fm=193&f=GIF","alt":"","title":null}}]},{"type":"paragraph","content":[{"type":"image","attrs":{"width":"143","height":"521","src":"https://t7.baidu.com/it/u=1595072465,3644073269&fm=193&f=GIF","alt":"","title":null}}]}]}\n',
      }

      this.currentVersion = currentVersion
      this.compareVersionData = compareVersionData

      this.isDataLoaded = true
      await this.$nextTick()
      // 设置编辑器内容
      this.$refs.diffEditor.setContents(this.currentVersion.content, this.compareVersionData.content)
    }
  }
}
</script>

<style scoped lang="less">
/deep/ .el-dialog__body {
  padding: 15px 20px;
}

.content-label {
  font-size: 16px;
  font-weight: bold;
}

.left-align {
  text-align: left;
}

.left-align .el-form-item__label {
  text-align: left;
}

.left-align .el-form-item__content {
  text-align: left;
}
</style>
