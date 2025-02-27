import {diffChars} from 'diff'
export const createEmptyDom = (tag) => {
  return document.createElement(tag);
};

export const handleTextAdded = (diff) => {
  const $ins = createEmptyDom('span');
  $ins.setAttribute('data-diff-add', 'add-text');
  $ins.innerHTML = diff.element.nodeValue || '';
  diff.element.replaceWith($ins);
};

export const handleTextRemoved = (diff) => {
  const $deleted = createEmptyDom('span');
  $deleted.setAttribute('data-diff-remove', 'remove-text');
  $deleted.innerText = diff.element.nodeValue || '';
  $deleted.dataset.del = 'remove-text';

  if (diff.after) {
    diff.after.parentNode?.insertBefore($deleted, diff.after.nextSibling);
  } else if (diff.before) {
    diff.before.parentNode?.insertBefore($deleted, diff.before);
  } else if (diff.in) {
    diff.in.appendChild($deleted);
  } else {
    console.log('Removed text lost: ', diff.element.textContent);
  }
};

const getTextDiff = (oldText, newText) => {
  // 强制使用逐字符对比
  return diffChars(oldText, newText);
};

const isComplexParagraph = (patches) => {
  const meta = { removeCount: 0, addCount: 0, removeIndex: 0, addIndex: 0 };
  patches.forEach((patch, index) => {
    if (patch.added) {
      ++meta.addCount;
      meta.addIndex = index;
    } else if (patch.removed) {
      ++meta.removeCount;
      meta.removeIndex = index;
    }
  });

  if (meta.addCount > 1 || meta.removeCount > 1) {
    return true;
  }

  if (
    meta.addCount === 1 &&
    meta.removeCount === 1 &&
    Math.abs(meta.addIndex - meta.removeIndex) > 1
  ) {
    return true;
  }

  return false;
};

export const handleTextModified = (diff) => {
  const fragment = document.createDocumentFragment();
  const textPatches = getTextDiff(diff.oldValue, diff.newValue);

  textPatches.forEach((item) => {
    if (item.added) {
      const $flag = createEmptyDom('span');
      $flag.setAttribute('data-diff-add', 'char-add');
      $flag.innerText = item.value;
      fragment.appendChild($flag);
    } else if (item.removed) {
      const $flag = createEmptyDom('span');
      $flag.setAttribute('data-diff-remove', 'char-remove');
      $flag.style.textDecoration = 'line-through'; // 直接添加删除线样式
      $flag.innerText = item.value;
      fragment.appendChild($flag);
    } else {
      fragment.append(item.value);
    }
  });

  diff.element.replaceWith(fragment);
};
export const handleAddElement = (diff) => {
  diff.element.setAttribute('data-diff-add', 'add-element');
};

export const handleRemoveElement = (diff) => {
  const $deleted = formatDeletedHtml(diff.element);
  
  // 添加这个判断来确保删除的元素被正确插入到DOM中
  if (diff.before) {
    diff.before.parentNode?.insertBefore($deleted, diff.before);
  } else if (diff.after) {
    diff.after.parentNode?.insertBefore($deleted, diff.after.nextSibling);
  } else if (diff.in) {
    diff.in.appendChild($deleted);
  }
};

export const handleReplaceElement = (diff) => {
  let $current = diff.newValue;
  let $prev = diff.oldValue;

  if ($current.nodeName === 'IMG' || $prev.nodeName === 'IMG') {
    // 如果是图片替换为文本
    if ($prev.nodeName === 'IMG' && $current.nodeType === Node.TEXT_NODE) {
      const $wrapper = createEmptyDom('span');
      $wrapper.setAttribute('data-diff-remove', 'remove-element');

      const $deleted = formatDeletedHtml($prev.cloneNode(true));
      $deleted.setAttribute('data-diff-type', 'img-to-text');
      $deleted.setAttribute('data-diff-remove', 'remove-element');
      $wrapper.appendChild($deleted);

      const $ins = createEmptyDom('span');
      $ins.setAttribute('data-diff-add', 'add-text');
      $ins.innerHTML = $current.nodeValue || '';

      const parentNode = $current.parentNode;
      $current.remove();
      parentNode.appendChild($wrapper);
      parentNode.appendChild($ins);
      return;
    }

    // 如果是文本替换为图片
    if ($current.nodeName === 'IMG' && $prev.nodeType === Node.TEXT_NODE) {
      const $wrapper = createEmptyDom('span');
      $wrapper.setAttribute('data-diff-remove', 'remove-text');

      const $deleted = formatDeletedHtml($prev.cloneNode(true));
      $deleted.setAttribute('data-diff-type', 'text-to-img');
      $deleted.setAttribute('data-diff-remove', 'remove-text');
      $wrapper.appendChild($deleted);

      const $imgWrapper = createEmptyDom('span');
      $imgWrapper.setAttribute('data-diff-add', 'add-element');

      const $newImg = $current.cloneNode(true);
      $newImg.setAttribute('data-diff-type', 'text-to-img');
      $newImg.setAttribute('data-diff-add', 'add-element');
      $imgWrapper.appendChild($newImg);

      const parentNode = $current.parentNode;
      $current.remove();
      parentNode.appendChild($wrapper);
      parentNode.appendChild($imgWrapper);
      return;
    }

    // 如果是图片替换图片
    if ($current.nodeName === 'IMG' && $prev.nodeName === 'IMG') {
      const prevSrc = $prev.getAttribute('src');
      const currentSrc = $current.getAttribute('src');

      if (prevSrc !== currentSrc) {
        console.log("图片替换图片，src 发生变化");
        const $wrapper = createEmptyDom('span');
        $wrapper.setAttribute('data-diff-remove', 'remove-element');

        const $deleted = formatDeletedHtml($prev.cloneNode(true));
        $deleted.setAttribute('data-diff-type', 'img-replaced');
        $deleted.setAttribute('data-diff-remove', 'remove-element');
        $wrapper.appendChild($deleted);

        const $imgWrapper = createEmptyDom('span');
        $imgWrapper.setAttribute('data-diff-add', 'add-element');

        const $newImg = $current.cloneNode(true);
        $newImg.setAttribute('data-diff-type', 'img-replaced');
        $newImg.setAttribute('data-diff-add', 'add-element');
        $imgWrapper.appendChild($newImg);

        const parentNode = $current.parentNode;
        $current.remove();
        parentNode.appendChild($wrapper);
        parentNode.appendChild($imgWrapper);
      } else {
        console.log("图片替换图片，但是 src 没有变化");
        const prevWidth = $prev.getAttribute('width') || $prev.style.width;
        const prevHeight = $prev.getAttribute('height') || $prev.style.height;
        const currentWidth = $current.getAttribute('width') || $current.style.width;
        const currentHeight = $current.getAttribute('height') || $current.style.height;

        if (prevWidth !== currentWidth || prevHeight !== currentHeight) {
          const $wrapper = createEmptyDom('span');

          const $newImg = $current.cloneNode(true);
          $newImg.setAttribute('data-diff-type', 'img-resized');
          $newImg.setAttribute('data-old-size', `${prevWidth}x${prevHeight}`);
          $newImg.setAttribute('data-new-size', `${currentWidth}x${currentHeight}`);
          $wrapper.appendChild($newImg);

          const parentNode = $current.parentNode;
          $current.remove();
          parentNode.appendChild($wrapper);
        }
      }
      return;
    }
  }

  if (
    $current.nodeType === Node.TEXT_NODE &&
    $prev.nodeName === 'SPAN' &&
    $prev.childNodes.length === 1 &&
    $prev.firstChild.nodeType === Node.TEXT_NODE
  ) {
    const textPatches = getTextDiff($current.nodeValue, $prev.firstChild.nodeValue);
    if (!isComplexParagraph(textPatches)) {
      const $wrapper = document.createElement('span');
      textPatches.forEach((change) => {
        if (change.added) {
          const $tmp = document.createElement('span');
          $tmp.setAttribute('data-diff-add', 'add-text');
          $tmp.innerText = change.value;
          $wrapper.appendChild($tmp);
        } else if (change.removed) {
          const $tmp = document.createElement('span');
          $tmp.setAttribute('data-diff-remove', 'remove-text');
          $tmp.innerText = change.value;
          $wrapper.appendChild($tmp);
        } else {
          $wrapper.appendChild(document.createTextNode(change.value));
        }
      });
      $current.replaceWith($wrapper);
      return;
    }
  } else if (
    $current.nodeName === 'SPAN' &&
    $current.childNodes.length === 1 &&
    $current.firstChild.nodeType === Node.TEXT_NODE &&
    $prev.nodeType === Node.TEXT_NODE
  ) {
    const textPatches = getTextDiff($current.firstChild.nodeValue, $prev.nodeValue);
    if (!isComplexParagraph(textPatches)) {
      const $wrapper = document.createElement('span');
      textPatches.forEach((change) => {
        if (change.added) {
          const $tmp = document.createElement('span');
          $tmp.setAttribute('data-diff-add', 'add-text');
          $tmp.innerText = change.value;
          $wrapper.appendChild($tmp);
        } else if (change.removed) {
          const $tmp = document.createElement('span');
          $tmp.setAttribute('data-diff-remove', 'remove-text');
          $tmp.innerText = change.value;
          $wrapper.appendChild($tmp);
        } else {
          $wrapper.appendChild(document.createTextNode(change.value));
        }
      });
      $current.replaceWith($wrapper);
      return;
    }
  }

  const $deleted = formatDeletedHtml(diff.oldValue);

  if ($current.nodeType === Node.TEXT_NODE) {
    const $ins = createEmptyDom('span');
    $ins.setAttribute('data-diff-add', 'add-text');
    $ins.innerHTML = $current.nodeValue || '';
    $current.replaceWith($ins);
    $current = $ins;
  } else {
    $current.setAttribute('data-diff-add', 'add-element');
  }

  $current.parentNode?.insertBefore($deleted, $current);
};

export const handleChangeAttribute = (diff) => {
  // 添加样式变更特殊处理
  if (diff.name === 'style') {
    const oldStyles = parseStyles(diff.oldValue);
    const newStyles = parseStyles(diff.newValue);

    if (oldStyles.color !== newStyles.color) {
      diff.element.setAttribute('data-diff-change', 'color-change');
    }
  } else {
    diff.element.setAttribute('data-diff-change', 'attribute-change');
  }

  diff.element.setAttribute('data-diff-change-name', diff.name);
};

const parseStyles = (styleStr) => {
  if (!styleStr) return {};
  return styleStr.split(';').reduce((acc, pair) => {
    const [key, value] = pair.split(':');
    if (key) acc[key.trim()] = value?.trim();
    return acc;
  }, {});
};

export const handleChangeTag = (diff) => {
  diff.element.setAttribute('data-diff-change', 'change-tag');
  diff.element.setAttribute('data-diff-change-name', `${diff.oldTag} -> ${diff.newTag}`);
};

export const formatMixedDom = ($wrapper) => {
  // 先处理图片的 diff 标记
  $wrapper.querySelectorAll('img').forEach(($img) => {
    // 如果图片已经有了特定的 diff type，移除可能存在的 change 标记
    if ($img.hasAttribute('data-diff-type')) {
      $img.removeAttribute('data-diff-change');
    }
  });

  // 处理其他元素
  $wrapper.querySelectorAll('[data-diff-add]').forEach(($item) => {
    $item.removeAttribute('data-diff-add');
    deepFindText($item, 'span', [], () => {
      const $span = createEmptyDom('span');
      $span.setAttribute('data-diff-add', 'add-text');
      return $span;
    });
    if ($item.tagName.toLowerCase() === 'span') {
      $item.outerHTML = $item.innerHTML;
    }
  });

  $wrapper.querySelectorAll('[data-diff-remove]').forEach(($item) => {
    $item.removeAttribute('data-diff-remove');
    deepFindText($item, 'span', [], () => {
      const $span = createEmptyDom('span');
      $span.setAttribute('data-diff-remove', 'remove-text');
      return $span;
    });
    if ($item.tagName.toLowerCase() === 'span') {
      $item.outerHTML = $item.innerHTML;
    }
  });

  $wrapper.querySelectorAll('[data-diff-change]').forEach(($item) => {
    // 跳过已经有 diff type 的图片
    if ($item.tagName.toLowerCase() === 'img' && $item.hasAttribute('data-diff-type')) {
      return;
    }
    deepFindText($item, 'span', ['table', 'thead', 'tbody', 'tr'], () => {
      const $span = createEmptyDom('span');
      $span.setAttribute('data-diff-change', $item.getAttribute('data-diff-change'));
      return $span;
    });
  });
};

const formatDeletedHtml = ($deleted) => {
  if ($deleted.nodeType === Node.TEXT_NODE) {
    const $del = createEmptyDom('span');
    $del.setAttribute('data-diff-remove', 'remove-text');
    $del.innerText = $deleted.nodeValue || '';
    return $del;
  } else {
    const $clone = $deleted.cloneNode(true);
    // 清除所有现有的 diff 标记
    $clone.removeAttribute('data-diff-add');
    $clone.removeAttribute('data-diff-change');
    $clone.setAttribute('data-diff-remove', 'remove-element');
    return $clone;
  }
};

const deepFindText = ($wrapper, tag, stopTags = [], createFlag) => {
  const tagName = ($wrapper.tagName || $wrapper.nodeName).toLowerCase();
  if ($wrapper.nodeType === Node.COMMENT_NODE) return;
  if (stopTags.includes(tagName)) return;
  if ($wrapper.tagName === 'SPAN' && $wrapper.classList.contains('el-checkbox')) return;

  if ($wrapper.nodeType === Node.TEXT_NODE) {
    const nodeValue = $wrapper.nodeValue || '';
    const $flag = createFlag ? createFlag() : createEmptyDom(tag);
    $flag.innerText = nodeValue;
    $wrapper.replaceWith($flag);
    return;
  }

  // 修改图片处理逻辑
  if ($wrapper.tagName && $wrapper.tagName.toLowerCase() === 'img') {
    // 如果图片已经有了 diff type，不要添加额外的标记
    if (!$wrapper.hasAttribute('data-diff-type')) {
      // 只有在没有其他 diff 标记的情况下才添加 change 标记
      if (!$wrapper.hasAttribute('data-diff-add') &&
          !$wrapper.hasAttribute('data-diff-remove')) {
        $wrapper.setAttribute('data-diff-change', 'img');
      }
    }
    return;
  }

  Array.from($wrapper.childNodes).forEach(($child) => {
    deepFindText($child, tag, stopTags, createFlag);
  });
};
