<template>
  <div ref="editor">
    <div class="editor" v-if="editor" tabindex="0">
      <editor-content class="editor__content" :editor="editor"/>
    </div>
  </div>
</template>

<script>
import {diff} from './js/html-diff'
import {
  createEmptyDom,
  formatMixedDom,
  handleAddElement,
  handleChangeAttribute,
  handleChangeTag,
  handleRemoveElement,
  handleReplaceElement,
  handleTextAdded,
  handleTextModified,
  handleTextRemoved
} from './js/index'
import {EditorContent} from '@tiptap/vue-2'
import './css/editor.css'
import {tipTapInit} from '@/components/tiptap/js/tipTapInit'

export default {
  components: {
    EditorContent
  },
  data () {
    return {
      editor: null,
      originContent: '',
      changedContent: ''
    }
  },
  computed: {},
  watch: {},
  mounted () {
    this.editor = tipTapInit().createEditor({
    })
  },
  methods: {
    getJSONstringify() {
      return JSON.stringify(this.editor.getJSON());
    },
    setContents (originContent, changedContent) {
      let originContent1 = this.convertTiptapJsonToHtml(originContent)
      let changedContent1 = this.convertTiptapJsonToHtml(changedContent)
      let content = this.diffContent(originContent1, changedContent1)
      this.editor.commands.setContent(content)
    },
    diffContent (originContent, changedContent) {
      const $origin = createEmptyDom('div')
      $origin.innerHTML = originContent
      const $changed = createEmptyDom('div')
      $changed.innerHTML = changedContent
      
      console.log('Original content:', originContent);
      console.log('Changed content:', changedContent);
      
      const diffs = diff($origin, $changed)
      console.log('Detailed diffs:', diffs)
      
      const unhandledDiffs = []

      console.log('diffs', diffs)
      for (const diff of diffs) {
        switch (diff.action) {
          case 'addElement':
            handleAddElement(diff)
            break
          case 'addAttribute':
          case 'modifyAttribute':
          case 'removeAttribute':
            handleChangeAttribute(diff)
            break
          case 'tagChanged':
            handleChangeTag(diff)
            break
          case 'removeElement':
            handleRemoveElement(diff)
            break
          case 'removeTextElement':
            handleTextRemoved(diff)
            break
          case 'replaceElement':
          case 'addTextElement':
          case 'modifyTextElement':
            unhandledDiffs.push(diff)
            break
          default:
            console.info('Unknown diff type: ', diff)
        }
      }

      unhandledDiffs.forEach((diff) => {
        switch (diff.action) {
          case 'replaceElement':
            handleReplaceElement(diff)
            break
          case 'addTextElement':
            handleTextAdded(diff)
            break
          case 'modifyTextElement':
            handleTextModified(diff)
            break
        }
      })

      formatMixedDom($changed)
      console.log('diffs', $changed.innerHTML)
      return $changed.innerHTML
    },

    convertTiptapJsonToHtml(jsonContent) {
      return  tipTapInit().createEditor({
        content: JSON.parse(jsonContent),
      }).getHTML();
    },
  }
}
</script>
<style scoped lang="less">


.tiptap {
  padding: 10px;
  border-radius: 8px;
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  overflow: visible;
}

.editor {
  display: flex;
  flex-direction: column;
  color: #333; /* 深色但不太深 */
  background-color: #f9f9f9; /* 浅色背景 */
  border: 1px solid #dcdfe6;
  border-radius: 0.75rem;
}

.editor__header {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  flex-wrap: wrap;
  padding: 0.25rem;
  border-bottom: 1px solid #dcdfe6;
}

.editor__content {
  padding: 0.25rem 0.25rem;
  flex: 1 1 auto;
  overflow: visible;
  -webkit-overflow-scrolling: touch;
}

.editor__content /deep/ [data-diff-remove],
.editor__content /deep/ [data-diff-remove] table tr,
.editor__content /deep/ [data-diff-remove] table td,
.editor__content /deep/ *[data-del] {
  text-decoration: line-through;
  color: #d9534f; /* 柔和的红色 */
  background-color: #f2dede !important; /* 浅红色背景 */
  position: relative;
}

.editor__content /deep/ [data-diff-remove]::after,
.editor__content /deep/ *[data-del]::after {
  content: '删除';
  position: absolute;
  top: -1.5em;
  left: 0;
  background: #d9534f;
  color: #fff;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
  display: none;
  white-space: nowrap; /* 确保内容不换行 */

}

.editor__content /deep/ [data-diff-remove]:hover::after,
.editor__content /deep/ *[data-del]:hover::after {
  display: block;
}

.editor__content /deep/ [data-diff-add],
.editor__content /deep/ [data-diff-add] table tr,
.editor__content /deep/ [data-diff-add] table td,
.editor__content /deep/ *[data-ins] {
  text-decoration: underline;
  background-color: #dff0d8 !important; /* 浅绿色背景 */
  color: #5cb85c; /* 柔和的绿色 */
  position: relative;
}

.editor__content /deep/ [data-diff-add]::after,
.editor__content /deep/ *[data-ins]::after {
  content: '新增';
  position: absolute;
  top: -1.5em;
  left: 0;
  background: #5cb85c;
  color: #fff;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
  display: none;
  white-space: nowrap; /* 确保内容不换行 */

}

.editor__content /deep/ [data-diff-add]:hover::after,
.editor__content /deep/ *[data-ins]:hover::after {
  display: block;
}

.editor__content /deep/ *[data-diff-change] {
  background-color: #d9edf7 !important; /* 浅蓝色背景 */
  color: #5bc0de; /* 柔和的蓝色 */
  position: relative;
}

.editor__content /deep/ *[data-diff-change]::after {
  content: '更改';
  position: absolute;
  top: -1.5em;
  left: 0;
  background: #5bc0de;
  color: #fff;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
  display: none;
  white-space: nowrap; /* 确保内容不换行 */

}

.editor__content /deep/ *[data-diff-change]:hover::after {
  display: block;
}

.editor__content /deep/ [data-diff-add],
.editor__content /deep/ [data-diff-remove],
.editor__content /deep/ *[data-diff-change] {
  padding: 0 3px;
}

.editor__content /deep/ img[data-diff-add] {
  border: 2px solid #5cb85c;
  padding: 2px;
  background-color: #dff0d8 !important;
}

.editor__content /deep/ img[data-diff-remove] {
  border: 2px solid #d9534f;
  padding: 2px;
  background-color: #f2dede !important;
  opacity: 0.7;
}

.editor__content /deep/ img[data-diff-change] {
  border: 2px solid #5bc0de;
  padding: 2px;
  background-color: #d9edf7 !important;
}

.editor__content /deep/ img[data-diff-add],
.editor__content /deep/ img[data-diff-remove],
.editor__content /deep/ img[data-diff-change] {
  position: relative;
  transition: all 0.3s ease;
}
</style>
