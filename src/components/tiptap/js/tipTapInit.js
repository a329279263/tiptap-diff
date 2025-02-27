import {Editor, Mark} from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Resizable from '@/components/tiptap/js/resizble'
import Links from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Underline from '@tiptap/extension-underline'

// 创建自定义的 Image 扩展
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...Image.config.addAttributes(),
      'data-diff-add': {
        default: null,
        parseHTML: element => element.getAttribute('data-diff-add'),
        renderHTML: attributes => {
          if (!attributes['data-diff-add']) return {}
          return { 'data-diff-add': attributes['data-diff-add'] }
        }
      },
      'data-diff-remove': {
        default: null,
        parseHTML: element => element.getAttribute('data-diff-remove'),
        renderHTML: attributes => {
          if (!attributes['data-diff-remove']) {
            return {}
          }
          return {
            'data-diff-remove': attributes['data-diff-remove']
          }
        }
      },
      'data-diff-change': {
        default: null,
        parseHTML: element => element.getAttribute('data-diff-change'),
        renderHTML: attributes => {
          if (!attributes['data-diff-change']) {
            return {}
          }
          return {
            'data-diff-change': attributes['data-diff-change']
          }
        }
      },
      'data-diff-type': {
        default: null,
        parseHTML: element => element.getAttribute('data-diff-type'),
        renderHTML: attributes => {
          if (!attributes['data-diff-type']) return {}
          return { 'data-diff-type': attributes['data-diff-type'] }
        }
      },
      'data-old-size': {
        default: null,
        parseHTML: element => element.getAttribute('data-old-size'),
        renderHTML: attributes => {
          if (!attributes['data-old-size']) return {}
          return { 'data-old-size': attributes['data-old-size'] }
        }
      },
      'data-new-size': {
        default: null,
        parseHTML: element => element.getAttribute('data-new-size'),
        renderHTML: attributes => {
          if (!attributes['data-new-size']) return {}
          return { 'data-new-size': attributes['data-new-size'] }
        }
      }
    }
  }
})

export function tipTapInit() {
  const createEditor = (options = {}) => {
    // 确保核心扩展最先加载
    const coreExtensions = [
      StarterKit,
      DiffMark,
      CustomImage.configure({inline: true, allowBase64: true}), // 使用自定义的 Image 扩展
      Resizable.configure({
        types: ["image", "video"], // resizable type
        handlerStyle: { // handler point style
          width: "8px",
          height: "8px",
          background: "#409eff",
        },
        layerStyle: { // layer mask style
          border: "2px dashed #409eff",
        },
      }),
      Links,
      Underline,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
    ]
    // 确保编辑器配置正确合并
    const baseConfig = {
      extensions: coreExtensions,
      onUpdate: ({editor}) => {
        console.log("json:", editor.getJSON());
        console.log("html:", editor.getHTML());
      },
      ...options,
    }

    try {
      const instance = new Editor(baseConfig)
      console.log('Editor state after init:', instance.state)
      return instance
    } catch (error) {
      console.error('Editor initialization failed:', error)
      throw new Error('编辑器初始化失败，请检查扩展配置')
    }
  }
  const DiffMark = Mark.create({
    name: 'diffMark', // 扩展名称

    // 定义允许的属性
    addAttributes() {
      return {
        'data-diff-add': {
          default: null,
          parseHTML: element => element.getAttribute('data-diff-add'),
          renderHTML: attributes => attributes['data-diff-add']
            ? {'data-diff-add': attributes['data-diff-add']}
            : {}
        },
        'data-diff-remove': {
          default: null,
          parseHTML: element => element.getAttribute('data-diff-remove'),
          renderHTML: attributes => attributes['data-diff-remove']
            ? {'data-diff-remove': attributes['data-diff-remove']}
            : {}
        },
        'data-diff-change': {
          default: null,
          parseHTML: element => element.getAttribute('data-diff-change'),
          renderHTML: attributes => attributes['data-diff-change']
            ? {'data-diff-change': attributes['data-diff-change']}
            : {}
        }
      }
    },

    // 定义如何解析 HTML
    parseHTML() {
      return [{
        tag: 'span', // 匹配的 HTML 标签
        getAttrs: element => ({
          // 仅当存在 diff 属性时才应用此 mark
          'data-diff-add': element.getAttribute('data-diff-add'),
          'data-diff-remove': element.getAttribute('data-diff-remove'),
          'data-diff-change': element.getAttribute('data-diff-change')
        })
      }]
    },

    // 定义如何渲染为 HTML
    renderHTML({HTMLAttributes}) {
      return ['span', HTMLAttributes, 0] // 渲染为 span 标签
    }
  })


  return {
    createEditor,
  }
}
