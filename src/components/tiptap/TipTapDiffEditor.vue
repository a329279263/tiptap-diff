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
      console.time('diff compare')
      const diffs = diff($origin, $changed)
      console.timeEnd('diff compare')
      const unhandledDiffs = []

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
  color: #0d0d0d;
  background-color: #fff;
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
  color: #666;
  background-color: #ffe7e7 !important;
}

.editor__content /deep/ [data-diff-add],
.editor__content /deep/ [data-diff-add] table tr,
.editor__content /deep/ [data-diff-add] table td,
.editor__content /deep/ *[data-ins] {
  text-decoration: underline;
  background-color: #ddfade !important;
}

.editor__content /deep/ img[data-del] {
  border: 8px solid #ffe7e7;
  box-sizing: content-box;
}

.editor__content /deep/ img[data-ins] {
  border: 8px solid #ddfade;
  box-sizing: content-box;
}

.editor__content /deep/ *[data-diff-change] {
  background-color: #d6f0ff !important;
}

.editor__content /deep/ [data-diff-add],
.editor__content /deep/ [data-diff-remove],
.editor__content /deep/ *[data-diff-change] {
  padding: 0 3px;
}

</style>
