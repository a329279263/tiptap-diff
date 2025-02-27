import similarity from 'similarity'
import {intersection} from 'lodash-es'
import hexRgb from 'hex-rgb'

export const NodeTypes = {
  node: 1,
  text: 3,
  comment: 8,
};

export const DiffPatches = {
  addTextElement: { action: 'addTextElement', element: HTMLElement },
  modifyTextElement: { action: 'modifyTextElement', oldValue: String, newValue: String, element: HTMLElement },
  removeTextElement: { action: 'removeTextElement', element: HTMLElement, before: HTMLElement | null, after: HTMLElement | null, in: HTMLElement },
  addElement: { action: 'addElement', element: HTMLElement },
  removeElement: { action: 'removeElement', before: HTMLElement | null, after: HTMLElement | null, element: HTMLElement },
  replaceElement: { action: 'replaceElement', newValue: HTMLElement, oldValue: HTMLElement },
  removeAttribute: { action: 'removeAttribute', name: String, value: String, element: HTMLElement },
  addAttribute: { action: 'addAttribute', name: String, value: String, element: HTMLElement },
  modifyAttribute: { action: 'modifyAttribute', name: String, oldValue: String, newValue: String, element: HTMLElement },
  tagChanged: { action: 'tagChanged', oldTag: String, newTag: String, element: HTMLElement },
};

const BREAKING_LINE_REG = /^[\n\s]+$/;
const MINIMUM_PRIORITY = 60;
const HIGH_PRIORITY = 80;
const ATTR_RATIO = 0.3;
const CHILDREN_RATIO = 0.5;
const TEXT_RATIO = 0.8;
const IDENTITY_PRIORITY = 70;

const PREFER_AS_REPLACE_ELEMENT = {
  IMG: ['src', 'width', 'height'],
  A: 'href',
};

export const diff = (from, to, options = {}) => {
  let $origin;
  if (typeof from === 'string') {
    $origin = document.createElement('div');
    $origin.innerHTML = from;
  } else {
    $origin = from;
  }

  let $changed;
  if (typeof to === 'string') {
    $changed = document.createElement('div');
    $changed.innerHTML = to;
  } else {
    $changed = to;
  }

  $origin.normalize();
  $changed.normalize();
  return diffInternal($origin, $changed, {
    ignoredAttributes: ['data-highlight-id', 'colwidth', 'rowspan', 'colspan'],
    ...options,
  });
};

const diffInternal = ($origin, $changed, options) => {
  let patches = [];

  const usedOriginChildIndex = [];
  const usedMaps = {};
  const cachedSimilarNodes = new Map();

  removeMarkTags($origin);
  removeMarkTags($changed);
  const originChildNodes = getUsefulChildNodes($origin);
  const changedChildNodes = getUsefulChildNodes($changed);

  changedChildNodes.forEach(($to, index) => {
    const originSliceFrom = (usedOriginChildIndex[0] ?? -1) + 1;
    const notComparedFromNodes = originChildNodes.slice(originSliceFrom);
    let $similar = null;
    let isFirstCrossMatched = false;

    if (changedChildNodes.length === 1 && originChildNodes.length === 1) {
      $similar = originChildNodes[0];
    } else if (cachedSimilarNodes.has($to)) {
      $similar = cachedSimilarNodes.get($to);
    } else {
      const { node, priority } = findSimilarNode($to, notComparedFromNodes);
      $similar = node;
      let reverseMatch = true;

      if ($similar && $similar !== notComparedFromNodes[0]) {
        const maybeCrossMatchedNodesLength = originChildNodes.findIndex((item) => item === $similar);
        const notComparedChangedNodes = changedChildNodes.slice(index + 1);
        for (let i = originSliceFrom; i < maybeCrossMatchedNodesLength; ++i) {
          if (findSimilarNode(originChildNodes[i], notComparedChangedNodes, priority + 1).node) {
            if (i > originSliceFrom) {
              $similar = originChildNodes[originSliceFrom];
              reverseMatch = false;
            } else {
              $similar = null;
              isFirstCrossMatched = true;
            }
            break;
          }
        }
      }

      if (reverseMatch && $similar && priority < 95 && index + 1 < changedChildNodes.length) {
        const betterMatched = findSimilarNode($similar, [changedChildNodes[index + 1]], 100);

        if (betterMatched.node) {
          cachedSimilarNodes.set(betterMatched.node, $similar);
          $similar = null;
          isFirstCrossMatched = true;
        }
      }
    }

    if (!isFirstCrossMatched && $similar === null && notComparedFromNodes.length > 0) {
      const notComparedChangedNodes = changedChildNodes.slice(index + 1);
      const crossMatch = findSimilarNode(notComparedFromNodes[0], notComparedChangedNodes, HIGH_PRIORITY);
      if (!crossMatch.node) {
        $similar = notComparedFromNodes[0];
      }
    }

    let currentIndex = $similar
      ? notComparedFromNodes.findIndex(($node) => $node === $similar) + originSliceFrom
      : -1;

    if (currentIndex >= 0) {
      usedOriginChildIndex.push(currentIndex);
      usedOriginChildIndex.sort((a, b) => b - a);
      usedMaps[currentIndex] = $to;
    }

    if (!$similar) {
      patches.push({
        action: $to.nodeType === NodeTypes.text ? 'addTextElement' : 'addElement',
        element: $to,
      });
      return;
    }

    if ($to.nodeName === $similar.nodeName) {
      patches.push(...getPatchBetweenSameTagNodes($similar, $to, options));
    } else if (preferAsSameTag($to, $similar)) {
      patches.push({
        action: 'tagChanged',
        oldTag: $similar.nodeName,
        newTag: $to.nodeName,
        element: $to,
      });
      patches.push(...getPatchBetweenSameTagNodes($similar, $to, options));
    } else {
      if (
        ($similar.nodeType === NodeTypes.text || $to.nodeType === NodeTypes.text) &&
        getInnerText($similar) === getInnerText($to)
      ) {
        const currentNodeName = $to.nodeName;
        if ($to.nodeType === NodeTypes.text) {
          const $span = document.createElement('span');
          $span.innerText = $to.nodeValue;
          $to.replaceWith($span);
          $to = $span;
          usedMaps[currentIndex] = $to;
        }
        patches.push({
          action: 'tagChanged',
          oldTag: $similar.nodeName,
          newTag: currentNodeName,
          element: $to,
        });
      } else {
        patches.push({
          action: 'replaceElement',
          newValue: $to,
          oldValue: $similar,
        });
      }
    }
  });

  originChildNodes.forEach(($node, index) => {
    if (usedOriginChildIndex.includes(index)) return;
    let insertBefore = null;
    let nextIndex = index + 1;
    while (nextIndex < originChildNodes.length) {
      if (usedMaps[nextIndex] !== undefined) {
        insertBefore = usedMaps[nextIndex];
        break;
      }
      nextIndex += 1;
    }

    const actionName = $node.nodeType === NodeTypes.text ? 'removeTextElement' : 'removeElement';
    let removePatch;

    if (insertBefore) {
      patches.push(
        (removePatch = {
          action: actionName,
          element: $node,
          before: insertBefore,
        }),
      );
    } else if (!changedChildNodes.length) {
      const isRootDiv = !$changed.parentElement;
      patches.unshift(
        (removePatch = {
          action: actionName,
          element: $node,
          ...(isRootDiv ? {} : { in: $changed }),
        }),
      );
    } else {
      const siblingPrev = usedOriginChildIndex.find((item) => item < index);

      if (siblingPrev === undefined) {
        patches.push(
          (removePatch = {
            action: actionName,
            element: $node,
            before: changedChildNodes[0],
          }),
        );
      } else {
        patches.unshift(
          (removePatch = {
            action: actionName,
            element: $node,
            after: usedMaps[siblingPrev],
          }),
        );
      }
    }

    if (removePatch.action === 'removeElement') {
      const $fromElement = removePatch.element;
      const $toElements = (
        removePatch.before
          ? removePatch.before.previousSibling
          : removePatch.after
            ? removePatch.after.nextSibling
            : null
      );
      if ($toElements) {
        const addPatch = patches.find((item) => {
          return item.action === 'addElement' && $toElements === item.element;
        });
        if (addPatch) {
          patches = patches.filter((item) => item !== addPatch && item !== removePatch);
          patches.push(...getPatchBetweenSameTagNodes($fromElement, addPatch.element, options));
        }
      }
    }
  });

  return patches;
};

const getPatchBetweenSameTagNodes = ($similar, $to, options) => {
  const patches = [];

  if ($to.nodeType === NodeTypes.text) {
    if ($to.nodeValue !== $similar.nodeValue) {
      patches.push({
        action: 'modifyTextElement',
        oldValue: $similar.nodeValue,
        newValue: $to.nodeValue,
        element: $to,
      });
    }
  } else {
    let replaced = false;
    
    if (isImageElement($to)) {
      if (compareImageAttributes($similar, $to)) {
        patches.push({
          action: 'replaceElement',
          oldValue: $similar,
          newValue: $to,
        });
        replaced = true;
      }
    } else {
      for (const tag of Object.keys(PREFER_AS_REPLACE_ELEMENT)) {
        if ($to.nodeName === tag && typeof PREFER_AS_REPLACE_ELEMENT[tag] === 'string') {
          if ($similar.getAttribute(PREFER_AS_REPLACE_ELEMENT[tag]) !== 
              $to.getAttribute(PREFER_AS_REPLACE_ELEMENT[tag])) {
            patches.push({
              action: 'replaceElement',
              oldValue: $similar,
              newValue: $to,
            });
            replaced = true;
            break;
          }
        }
      }
    }

    if (!replaced) {
      patches.push(...collectAttrPatches($similar, $to, options));
      if ($similar.innerHTML !== $to.innerHTML) {
        patches.push(...diffInternal($similar, $to, options));
      }
    }
  }

  return patches;
};

const getNodeIndex = ($node) => {
  let index = 0,
    prev = $node;
  while ((prev = prev.previousSibling)) {
    index += 1;
  }
  return index;
};

const getInnerText = ($dom) => {
  if ($dom.nodeType === NodeTypes.text) {
    return $dom.nodeValue || '';
  }

  return $dom.innerText;
};

const stylesSeparatorReg = /;\s*/;
const emptyStyleSeparatorReg = /:\s*$/;
const styleSeparatorReg = /:\s*/;
const hexColorReg = /:\s*(#\d{3}|#\d{6})$/;

const formatAttribute = ($node, attrKey) => {
  const value = $node.getAttribute(attrKey) || '';
  if (attrKey === 'style') {
    return value
      .split(stylesSeparatorReg)
      .map((style) => {
        if (emptyStyleSeparatorReg.test(style)) return '';
        if (hexColorReg.test(style)) {
          const colorEntries = style.split(styleSeparatorReg);
          const { red, green, blue } = hexRgb(colorEntries[1]);
          return `${colorEntries[0]}: rgb(${red}, ${green}, ${blue})`;
        }
        return style;
      })
      .filter(Boolean)
      .join('; ');
  }

  return value;
};

const collectAttrPatches = ($from, $to, options) => {
  const patches = [];

  const fromAttrs = $from
    .getAttributeNames()
    .filter((item) => !options.ignoredAttributes.includes(item));
  const toAttrs = $to
    .getAttributeNames()
    .filter((item) => !options.ignoredAttributes.includes(item));

  const commonAttrs = intersection(fromAttrs, toAttrs);
  for (const attr of fromAttrs) {
    if (!commonAttrs.includes(attr) && !!formatAttribute($from, attr)) {
      patches.push({
        action: 'removeAttribute',
        name: attr,
        value: $from.getAttribute(attr) || '',
        element: $to,
      });
    }
  }
  for (const attr of toAttrs) {
    if (!commonAttrs.includes(attr) && !!formatAttribute($to, attr)) {
      patches.push({
        action: 'addAttribute',
        name: attr,
        value: $to.getAttribute(attr) || '',
        element: $to,
      });
    }
  }
  for (const attr of commonAttrs) {
    const fromAttr = formatAttribute($from, attr);
    const toAttr = formatAttribute($to, attr);
    if (fromAttr !== toAttr) {
      patches.push({
        action: 'modifyAttribute',
        name: attr,
        newValue: toAttr,
        oldValue: fromAttr,
        element: $to,
      });
    }
  }

  return patches;
};

const isMarkTag = ($node) => {
  return (
    $node.nodeName === 'SPAN' &&
    ($node.dataset.highlightId || $node.classList.contains('inline-comment-marker'))
  );
};

const replaceMarkTagToText = ($node) => {
  if (isMarkTag($node)) {
    const firstChild = $node.firstChild?.cloneNode(true);
    if (firstChild) {
      $node.replaceWith(firstChild);
      replaceMarkTagToText(firstChild);
    } else {
      $node.remove();
    }
  }
};

const removeMarkTags = ($parent) => {
  $parent.childNodes.forEach(replaceMarkTagToText);
  $parent.normalize();
};

export const getUsefulChildNodes = ($parent) => {
  return Array.from($parent.childNodes).filter((item) => {
    return item.nodeType !== NodeTypes.comment && item.nodeName !== 'COLGROUP';
  });
};

export const findSimilarNode = ($to, compareNodes, minimumPriority = MINIMUM_PRIORITY) => {
  if (!compareNodes.length) return { node: null, priority: 0 };
  // 添加文本长度差异惩罚
  if (Math.abs(getInnerText($to).length - getInnerText(compareNodes[0]).length) > 3) {
    minimumPriority -= 15;
  }
  const nodeResult = [];

  compareNodes.forEach(($from, index) => {
    let priority = 100;

    if ($to.nodeName !== $from.nodeName && !preferAsSameTag($to, $from)) {
      priority -= IDENTITY_PRIORITY;
    }

    priority = getIdentityPriority($from, $to, priority);

    if (priority >= minimumPriority) {
      const attrPriority = getAttributePriority($from, $to) / 100;
      priority = priority * (1 - ATTR_RATIO) + priority * ATTR_RATIO * attrPriority;
    }

    if (priority >= minimumPriority) {
      const childrenPriority = getChildrenPriority($from, $to) / 100;
      priority = priority * (1 - CHILDREN_RATIO) + priority * CHILDREN_RATIO * childrenPriority;
    }

    if (priority >= minimumPriority) {
      const textPriority = getTextPriority($from, $to) / 100;
      priority = priority * (1 - TEXT_RATIO) + priority * TEXT_RATIO * textPriority;
    }

    nodeResult.push({ index, priority, element: $from });
  });

  nodeResult.sort((a, b) => b.priority - a.priority);

  if (
    nodeResult.length >= 2 &&
    nodeResult[1].priority >= 85 &&
    nodeResult[0].priority - nodeResult[1].priority <= 10
  ) {
    const firstOriginNodeIndex = getNodeIndex(nodeResult[0].element);
    const secondOriginNodeIndex = getNodeIndex(nodeResult[1].element);
    const changedNodeIndex = getNodeIndex($to);
    if (
      Math.abs(secondOriginNodeIndex - changedNodeIndex) < Math.abs(firstOriginNodeIndex - changedNodeIndex)
    ) {
      [nodeResult[0], nodeResult[1]] = [nodeResult[1], nodeResult[0]];
    }
  }

  return nodeResult[0].priority >= minimumPriority
    ? { node: compareNodes[nodeResult[0].index], priority: nodeResult[0].priority }
    : { node: null, priority: 0 };
};

const getChildrenNames = ($element) => {
  return getUsefulChildNodes($element)
    .map(($node) => {
      if ($node.nodeType === NodeTypes.text && BREAKING_LINE_REG.test($node.nodeValue || '')) {
        return '';
      }
      if (isMarkTag($node)) return '#text';
      return $node.nodeName;
    })
    .filter(Boolean)
    .join(' ')
    .replace(/#text(\s#text)+/g, '#text');
};

const getChildrenPriority = ($from, $to) => {
  const priority = 100;
  const fromChildrenNames = getChildrenNames($from);
  const toChildrenNames = getChildrenNames($to);
  return priority * similarity(fromChildrenNames, toChildrenNames);
};

export const getIdentityPriority = ($from, $to, originPriority) => {
  if ($from.nodeType === NodeTypes.text || $to.nodeType === NodeTypes.text) return originPriority;
  
  if (isImageElement($from) && isImageElement($to)) {
    const fromSrc = $from.getAttribute('src') || '';
    const toSrc = $to.getAttribute('src') || '';
    if (fromSrc === toSrc) {
      return originPriority + IDENTITY_PRIORITY;
    }
    const fromWidth = $from.getAttribute('width') || '';
    const fromHeight = $from.getAttribute('height') || '';
    const toWidth = $to.getAttribute('width') || '';
    const toHeight = $to.getAttribute('height') || '';
    if (fromWidth === toWidth && fromHeight === toHeight) {
      return originPriority + (IDENTITY_PRIORITY / 2);
    }
  }

  const fromId = $from.getAttribute('id');
  const toId = $to.getAttribute('id');
  if (fromId && fromId === toId) return originPriority + IDENTITY_PRIORITY;
  if (fromId !== toId) return originPriority - IDENTITY_PRIORITY;
  return originPriority;
};

const getAttributePriority = ($from, $to) => {
  let priority = 100;

  if ($from.nodeType === NodeTypes.text || $to.nodeType === NodeTypes.text) return priority;

  const fromAttrs = $from.getAttributeNames().sort();
  const toAttrs = $to.getAttributeNames().sort();
  const commonAttrs = intersection(fromAttrs, toAttrs);
  priority -= Math.min(15, 3 * (fromAttrs.length + toAttrs.length - commonAttrs.length * 2));

  const maxReducedPriority = priority / commonAttrs.length;
  commonAttrs.forEach((attrName) => {
    const fromValue = $from.getAttribute(attrName) || '';
    const toValue = $to.getAttribute(attrName) || '';
    priority -= maxReducedPriority * (1 - similarity(fromValue, toValue, { sensitive: true }));
  });

  return priority;
};

const getTextPriority = ($from, $to) => {
  let priority = 100;
  const fromContent = getInnerText($from);
  const toContent = getInnerText($to);

  priority *= similarity(fromContent, toContent);

  return priority;
};

const preferAsSameTag = ($a, $b) => {
  if (
    ($a.nodeName === 'TH' && $b.nodeName === 'TD') ||
    ($a.nodeName === 'TD' && $b.nodeName === 'TH')
  ) {
    return true;
  }

  return false;
};

const selector = 'span[data-highlight-id]';

export const syncMark = (sourceContent, destContent) => {
  if (sourceContent === destContent) return destContent;

  const $source = document.createElement('div');
  $source.innerHTML = sourceContent;
  $source.normalize();

  const $dest = document.createElement('div');
  $dest.innerHTML = destContent;
  $dest.normalize();

  const sourceMarks = $source.querySelectorAll(selector);
  if (sourceMarks.length === 0) return destContent;
  const destMarks = Array.from($dest.querySelectorAll(selector));
  const newHighlightIds = [];
  sourceMarks.forEach(($mark) => {
    const id = $mark.getAttribute('data-highlight-id');
    if (id && !destMarks.find(($destMark) => $destMark.getAttribute('data-highlight-id') === id)) {
      newHighlightIds.push(id);
    }
  });
  internalSyncMark($source, $dest, newHighlightIds);
  return $dest.innerHTML;
};

const internalSyncMark = ($source, $dest, newHighlightIds) => {
  const sourceChildNodes = getUsefulChildNodes($source);
  const destChildNodes = getUsefulChildNodes($dest);

  if (
    sourceChildNodes.some(($child) => {
      return $child.nodeName === 'SPAN' && $child.hasAttribute('data-highlight-id');
    })
  ) {
    const sourceHighlightNodes = Array.from($source.querySelectorAll(selector)).filter(($child) => {
      const id = $child.getAttribute('data-highlight-id');
      return id && newHighlightIds.includes(id);
    });

    if (!sourceHighlightNodes.length) return;

    sourceHighlightNodes.forEach(($child) => {
      const highlightOuterHtml = $child.outerHTML;
      const highlightInnerHtml = $child.innerHTML;
      const sourceArr = $source.innerHTML.split(highlightOuterHtml);
      const markIndex = sourceArr[0].split(highlightInnerHtml).length - 1;

      let destMarkIndex = -1;
      (function loop($dest) {
        const destNodes = getUsefulChildNodes($dest);
        for (let i = 0; i < destNodes.length; ++i) {
          const $destChild = destNodes[i];

          if ($destChild.nodeType === NodeTypes.text) {
            const currentMarkCount = $destChild.nodeValue.split(highlightInnerHtml).length - 1;
            destMarkIndex += currentMarkCount;
            if (destMarkIndex >= markIndex) {
              const $div = document.createElement('div');
              $div.innerHTML = $destChild
                .nodeValue.split(highlightInnerHtml)
                .reduce((carry, item, itemIndex, destArr) => {
                  const separator =
                    destArr.length - 1 === itemIndex
                      ? ''
                      : itemIndex === markIndex
                        ? highlightOuterHtml
                        : highlightInnerHtml;
                  return carry + item + separator;
                }, '');

              $div.childNodes.forEach(($node) => {
                $dest.insertBefore($node.cloneNode(true), $destChild);
              });
              $destChild.remove();
            }
          } else if ($destChild.nodeType === NodeTypes.node) {
            const currentMarkCount = $destChild.innerHTML.split(highlightInnerHtml).length - 1;
            if (destMarkIndex + currentMarkCount >= markIndex) {
              if ($destChild.nodeName === 'SPAN' && $destChild.hasAttribute('data-highlight-id')) {
                destMarkIndex += currentMarkCount;
              } else {
                loop($destChild);
              }
            }
          }

          if (destMarkIndex >= markIndex) break;
        }
      })($dest);
    });

    return;
  }

  const usedMaps = {};

  for (let index = 0; index < sourceChildNodes.length; ++index) {
    const $node = sourceChildNodes[index];
    if ($node.nodeType !== NodeTypes.node) continue;

    const matchedNodes = Object.values(usedMaps);
    let $similar = null;

    if (sourceChildNodes.length === 1 && destChildNodes.length === 1) {
      $similar = destChildNodes[0];
    } else {
      $similar = findSimilarNode(
        $node,
        destChildNodes.filter(($item) => !matchedNodes.includes($item)),
      ).node;
    }

    if (!$similar) continue;

    usedMaps[index] = $similar;

    if ($node.nodeName !== $similar.nodeName) continue;

    const hasNewHighlightId = Array.from($node.querySelectorAlsl(selector)).some(($mark) => {
      const id = $mark.getAttribute('data-highlight-id');
      return id && newHighlightIds.includes(id);
    });

    if (hasNewHighlightId) {
      internalSyncMark($node, $similar, newHighlightIds);
    }
  }
};

const isImageElement = ($node) => {
  return $node.nodeName === 'IMG';
};

const compareImageAttributes = ($from, $to) => {
  const attrs = PREFER_AS_REPLACE_ELEMENT.IMG;
  return attrs.some(attr => {
    const fromValue = $from.getAttribute(attr) || '';
    const toValue = $to.getAttribute(attr) || '';
    return fromValue !== toValue;
  });
};
