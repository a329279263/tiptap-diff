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
  diff.element.replaceWith($deleted);
};

export const handleReplaceElement = (diff) => {
  let $current = diff.newValue;
  let $prev = diff.oldValue;

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
    $deleted.setAttribute('data-diff-remove', 'remove-element');
    return $deleted;
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

  if ($wrapper.tagName.toLowerCase() === 'img') {
    $wrapper.setAttribute('data-diff-change', 'img');
    return;
  }

  Array.from($wrapper.childNodes).forEach(($child) => {
    deepFindText($child, tag, stopTags, createFlag);
  });
};
