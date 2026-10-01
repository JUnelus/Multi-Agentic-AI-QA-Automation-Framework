import { Page } from '@playwright/test';
export async function observeElements(page: Page, pageId: string) {
  return page.evaluate(id => {
    const elements = Array.from(document.querySelectorAll('input,textarea,select,button,a,form,[role],h1,h2,h3,h4,h5,h6')).slice(0, 500);
    return elements.map((el, i) => {
      const tag = el.tagName.toLowerCase();
      const labelled = (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(key => document.getElementById(key)?.textContent || '').join(' ').trim();
      const labels = 'labels' in el ? Array.from((el as HTMLInputElement).labels || []).map(l => l.textContent || '').join(' ') : '';
      const accessibleName = el.getAttribute('aria-label') || labelled || labels || el.getAttribute('alt') || (tag === 'input' ? el.getAttribute('placeholder') || '' : el.textContent || '');
      const roles: Record<string, string> = { button: 'button', a: el.hasAttribute('href') ? 'link' : '', textarea: 'textbox', select: 'combobox', form: 'form' };
      const type = el.getAttribute('type');
      const role = el.getAttribute('role') || (tag === 'input' ? (['submit','button'].includes(type || '') ? 'button' : type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : 'textbox') : /^h[1-6]$/.test(tag) ? 'heading' : roles[tag] || '');
      const attr = ['data-test','data-testid','id','name'].find(a => el.getAttribute(a));
      const selector = attr ? '[' + attr + '="' + CSS.escape(el.getAttribute(attr)!) + '"]' : undefined;
      const style = getComputedStyle(el);
      return { evidenceId: id + '-OBS-' + String(i + 1).padStart(3, '0'), tag, role, accessibleName: accessibleName.trim().slice(0, 500), selector, visible: !!el.getClientRects().length && style.visibility !== 'hidden' && style.display !== 'none' };
    });
  }, pageId);
}

