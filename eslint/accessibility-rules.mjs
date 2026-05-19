function getName(nameNode) {
  if (!nameNode) return '';
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${getName(nameNode.object)}.${getName(nameNode.property)}`;
  }
  return '';
}

function nodeHasMeaningfulText(node) {
  if (!node) return false;

  if (node.type === 'JSXText') {
    return /[A-Za-z0-9]/.test(node.value || '');
  }

  if (node.type === 'JSXExpressionContainer' && node.expression) {
    return node.expression.type !== 'JSXEmptyExpression';
  }

  if (node.type === 'JSXElement') {
    return (node.children || []).some((child) => nodeHasMeaningfulText(child));
  }

  if (node.type === 'JSXFragment') {
    return (node.children || []).some((child) => nodeHasMeaningfulText(child));
  }

  return false;
}

function hasRenderableNonTextChild(children) {
  return children.some((child) => {
    if (child.type === 'JSXElement' || child.type === 'JSXFragment') return true;
    if (child.type === 'JSXExpressionContainer') {
      return (
        child.expression &&
        (child.expression.type === 'JSXElement' ||
          child.expression.type === 'JSXFragment')
      );
    }
    return false;
  });
}

function isIconLikeTagName(tagName) {
  if (!tagName) return false;
  const lowerSvgTags = new Set([
    'svg',
    'path',
    'circle',
    'line',
    'polyline',
    'polygon',
    'rect',
    'g',
    'use',
  ]);

  if (lowerSvgTags.has(tagName)) return true;
  return /^[A-Z]/.test(tagName);
}

function hasIconLikeChild(node) {
  if (!node) return false;

  if (node.type === 'JSXElement') {
    const tagName = getName(node.openingElement?.name);
    if (isIconLikeTagName(tagName)) return true;
    return (node.children || []).some((child) => hasIconLikeChild(child));
  }

  if (node.type === 'JSXFragment') {
    return (node.children || []).some((child) => hasIconLikeChild(child));
  }

  return false;
}

function isIconOnlyElement(node) {
  if (!node || node.type !== 'JSXElement') return false;
  const children = node.children || [];
  if (!hasRenderableNonTextChild(children)) return false;
  if (!children.some((child) => hasIconLikeChild(child))) return false;
  if (children.some((child) => nodeHasMeaningfulText(child))) return false;
  return true;
}

function hasAccessibilityExceptionComment(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node) || [];
  return comments.some((comment) =>
    (comment.value || '').toLowerCase().includes('accessibility-exception:'),
  );
}

const WRAPPER_NAMES = new Set([
  'AccessibleIconButton',
  'TooltipIconButton',
  'IconButtonWithTooltip',
]);

const ICON_ONLY_BUTTON_NAMES = new Set(['button', 'Button']);

export const accessibilityRulesPlugin = {
  rules: {
    'no-raw-icon-only-buttons': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Enforce AccessibleIconButton wrapper for icon-only controls to guarantee aria-label/title/tooltip.',
        },
        schema: [],
        messages: {
          useWrapper:
            'Icon-only {{tag}} must use AccessibleIconButton (or approved wrapper). Add // accessibility-exception: <reason> only for third-party constraints.',
        },
      },
      create(context) {
        const sourceCode = context.getSourceCode();

        return {
          JSXElement(node) {
            const openingElement = node.openingElement;
            const elementName = getName(openingElement.name);

            if (WRAPPER_NAMES.has(elementName)) return;
            if (!ICON_ONLY_BUTTON_NAMES.has(elementName)) return;
            if (!isIconOnlyElement(node)) return;
            if (hasAccessibilityExceptionComment(sourceCode, node)) return;

            context.report({
              node: openingElement,
              messageId: 'useWrapper',
              data: { tag: elementName },
            });
          },
        };
      },
    },
  },
};
