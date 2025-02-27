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
      console.time('diff compare')
      const diffs = diff($origin, $changed)
      console.timeEnd('diff compare')
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

.editor__content /deep/ img[data-diff-add]::after,
.editor__content /deep/ img[data-diff-remove]::after,
.editor__content /deep/ img[data-diff-change]::after {
  position: absolute;
  top: -20px;
  left: 0;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: #fff;
  display: none;
}

.editor__content /deep/ img[data-diff-add]:hover::after {
  content: '新增图片';
  background: #5cb85c;
  display: block;
}

.editor__content /deep/ img[data-diff-remove]:hover::after {
  content: '删除图片';
  background: #d9534f;
  display: block;
}

.editor__content /deep/ img[data-diff-change]:hover::after {
  content: '修改图片';
  background: #5bc0de;
  display: block;
}

// 图片替换样式
.editor__content /deep/ img[data-diff-type="img-replaced"][data-diff-remove] {
  border: 2px solid #d9534f;
  padding: 2px;
  background-color: #f2dede !important;
  opacity: 0.7;
}

.editor__content /deep/ img[data-diff-type="img-replaced"][data-diff-add] {
  border: 2px solid #5cb85c;
  padding: 2px;
  background-color: #dff0d8 !important;
}

// 图片尺寸变化样式
.editor__content /deep/ img[data-diff-change="img-resized"] {
  border: 2px solid #5bc0de;
  padding: 2px;
  background-color: #d9edf7 !important;
}

// 图片与文本转换样式
.editor__content /deep/ [data-diff-type="img-to-text"],
.editor__content /deep/ [data-diff-type="text-to-img"] {
  position: relative;
}

// 修改悬停提示
.editor__content /deep/ img[data-diff-type="img-replaced"][data-diff-remove]:hover::after {
  content: '原图片';
  background: #d9534f;
}

.editor__content /deep/ img[data-diff-type="img-replaced"][data-diff-add]:hover::after {
  content: '替换为新图片';
  background: #5cb85c;
}

.editor__content /deep/ img[data-diff-change="img-resized"]:hover::after {
  content: attr(data-old-size) ' → ' attr(data-new-size);
  background: #5bc0de;
  white-space: nowrap;
}

.editor__content /deep/ [data-diff-type="img-to-text"]:hover::after {
  content: '图片已替换为文本';
  background: #f0ad4e;
}

.editor__content /deep/ [data-diff-type="text-to-img"]:hover::after {
  content: '文本已替换为图片';
  background: #f0ad4e;
}

// 删除或合并重复的样式，保留以下核心样式
.editor__content /deep/ {
  // 确保 diff-wrapper 不会被 TipTap 移除
  .diff-wrapper {
    display: inline-block;
    min-width: 1px;
    min-height: 1px;
  }

  // 图片包装器基础样式
  span[data-diff-remove] {
    text-decoration: line-through;
    display: inline-block;
    
    img {
      opacity: 0.7;
    }
  }
  
  span[data-diff-add] {
    text-decoration: underline;
    display: inline-block;
  }

  // 图片基础悬浮提示样式
  img[data-diff-type] {
    display: inline-block;
    margin: 2px;
    
    &::after {
      position: absolute;
      top: -25px;
      left: 0;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 12px;
      color: #fff;
      display: none;
      z-index: 100;
    }
    
    &:hover::after {
      display: block;
    }
  }

  // 图片替换样式
  span[data-diff-remove] img[data-diff-type="img-replaced"] {
    border: 2px solid #d9534f;
    padding: 2px;
    background-color: #f2dede !important;
    
    &:hover::after {
      content: '原图片';
      background: #d9534f;
    }
  }

  span[data-diff-add] img[data-diff-type="img-replaced"] {
    border: 2px solid #5cb85c;
    padding: 2px;
    background-color: #dff0d8 !important;
    
    &:hover::after {
      content: '替换为新图片';
      background: #5cb85c;
    }
  }

  // 图片尺寸变化样式
  img[data-diff-type="img-resized"] {
    border: 2px solid #5bc0de;
    padding: 2px;
    background-color: #d9edf7 !important;
    
    &:hover::after {
      content: attr(data-old-size) ' → ' attr(data-new-size);
      background: #5bc0de;
      white-space: nowrap;
    }
  }

  // 图片文本转换样式
  span[data-diff-remove] img[data-diff-type="img-to-text"] {
    border: 2px solid #f0ad4e;
    padding: 2px;
    background-color: #fcf8e3 !important;
    
    &:hover::after {
      content: '图片已替换为文本';
      background: #f0ad4e;
    }
  }

  span[data-diff-add] img[data-diff-type="text-to-img"] {
    border: 2px solid #f0ad4e;
    padding: 2px;
    background-color: #fcf8e3 !important;
    
    &:hover::after {
      content: '文本已替换为图片';
      background: #f0ad4e;
    }
  }
}
</style>
