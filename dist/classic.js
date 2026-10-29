/*! classic.js v1.0.0 | MIT License | github.com/mario-deluna/classic-css
 *
 * Optional behaviour for classic.css. Everything works without it, this
 * just makes menus, tabs, spinners, list views and windows feel right.
 * Components opt in through data attributes:
 *
 *   data-menubar            menu bar with click / hover / keyboard handling
 *   data-contextmenu="#id"  shows the .menu #id on right click
 *   data-tabs               tab switching (aria-selected + hidden)
 *   data-listview           row / item selection (ctrl & shift supported)
 *   data-window             title bar buttons close / maximize, activation
 *   data-draggable          window can be moved by its title bar
 *   data-start-button="#id" toggles the start menu #id
 *   data-clock              shows the current time
 *
 * Spinner buttons and drop down lists work automatically. Call
 * Classic.init(element) after adding markup dynamically.
 */
(function () {
	'use strict';

	function $$(root, selector) {
		return Array.prototype.slice.call(root.querySelectorAll(selector));
	}

	function emit(el, name, detail) {
		return el.dispatchEvent(new CustomEvent('classic:' + name, { bubbles: true, cancelable: true, detail: detail || {} }));
	}

	// runs fn once per element matching selector
	function each(root, selector, key, fn) {
		var els = $$(root, selector);
		if (root.matches && root.matches(selector)) els.unshift(root);
		els.forEach(function (el) {
			if (el['_classic' + key]) return;
			el['_classic' + key] = true;
			fn(el);
		});
	}

	/**
	 * Menus
	 */
	function selectableItems(menu) {
		return $$(menu, ':scope > li:not(.menu-separator)');
	}

	function setActive(menu, li) {
		selectableItems(menu).forEach(function (item) {
			item.classList.toggle('active', item === li);
			if (item !== li) closeSubmenu(item);
		});
	}

	function openSubmenu(li) {
		if (!li.classList.contains('menu-submenu')) return null;
		li.classList.add('open');
		return li.querySelector(':scope > .menu');
	}

	function closeSubmenu(li) {
		li.classList.remove('open');
		$$(li, '.open, .active').forEach(function (el) { el.classList.remove('open', 'active'); });
	}

	function chooseItem(li) {
		if (li.classList.contains('disabled') || li.classList.contains('menu-submenu')) return false;
		emit(li, 'select', { item: li });
		return true;
	}

	// arrow key handling inside an open menu, returns false when not handled
	function menuKey(menu, key) {
		var items = selectableItems(menu);
		var index = items.indexOf(menu.querySelector(':scope > li.active'));

		if (key === 'ArrowDown' || key === 'ArrowUp') {
			var next = key === 'ArrowDown' ? index + 1 : index - 1;
			setActive(menu, items[(next + items.length) % items.length]);
			return true;
		}
		if (key === 'Enter' && items[index]) {
			return chooseItem(items[index]) ? 'chosen' : menuKey(menu, 'ArrowRight');
		}
		if (key === 'ArrowRight' && items[index]) {
			var sub = openSubmenu(items[index]);
			if (!sub) return false;
			setActive(sub, selectableItems(sub)[0]);
			return true;
		}
		return false;
	}

	// the deepest menu currently open below el
	function deepestMenu(el) {
		var menu = el.querySelector(':scope > .menu');
		var sub;
		while (menu && (sub = menu.querySelector(':scope > li.open > .menu'))) menu = sub;
		return menu;
	}

	function initMenuHover(menu) {
		menu.addEventListener('mouseover', function (e) {
			var li = e.target.closest('.menu > li');
			if (!li || li.classList.contains('menu-separator')) return;
			var parent = li.parentElement;
			setActive(parent, li);
			openSubmenu(li);
		});
	}

	function initMenubar(bar) {
		bar.setAttribute('data-js', '');
		var items = $$(bar, ':scope > .menubar-item');
		var open = null;

		function setOpen(item) {
			if (open === item) return;
			if (open) {
				open.classList.remove('open');
				$$(open, '.open, .active').forEach(function (el) { el.classList.remove('open', 'active'); });
			}
			open = item;
			if (item) {
				item.classList.add('open');
				item.focus();
			}
		}

		function step(item, dir) {
			return items[(items.indexOf(item) + dir + items.length) % items.length];
		}

		items.forEach(function (item) {
			var menu = item.querySelector(':scope > .menu');
			if (menu) initMenuHover(menu);

			item.addEventListener('mousedown', function (e) {
				if (e.target.closest('.menu')) return;
				e.preventDefault();
				setOpen(open === item ? null : item);
			});

			item.addEventListener('mouseenter', function () {
				if (open) setOpen(item);
			});

			item.addEventListener('keydown', function (e) {
				if (!open) {
					if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(item);
					else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') step(item, e.key === 'ArrowRight' ? 1 : -1).focus();
					else return;
					e.preventDefault();
					return;
				}

				var current = deepestMenu(item);
				var result = current && menuKey(current, e.key);

				if (result === 'chosen') {
					setOpen(null);
				} else if (!result) {
					if (e.key === 'ArrowLeft' && current !== menu) {
						closeSubmenu(current.parentElement);
					} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
						setOpen(step(item, e.key === 'ArrowRight' ? 1 : -1));
					} else if (e.key === 'Escape') {
						if (current !== menu) closeSubmenu(current.parentElement);
						else setOpen(null);
					} else {
						return;
					}
				}
				e.preventDefault();
			});
		});

		bar.addEventListener('click', function (e) {
			var li = e.target.closest('.menu > li');
			if (li && chooseItem(li)) setOpen(null);
		});

		document.addEventListener('pointerdown', function (e) {
			if (open && !bar.contains(e.target)) setOpen(null);
		});
	}

	function initContextMenu(target) {
		var menu = document.querySelector(target.getAttribute('data-contextmenu'));
		if (!menu) return;
		menu.hidden = true;
		menu.style.position = 'fixed';
		initMenuHover(menu);

		function close() {
			menu.hidden = true;
			$$(menu, '.open, .active').forEach(function (el) { el.classList.remove('open', 'active'); });
		}

		target.addEventListener('contextmenu', function (e) {
			e.preventDefault();
			menu.hidden = false;
			menu.style.left = Math.min(e.clientX, window.innerWidth - menu.offsetWidth) + 'px';
			menu.style.top = Math.min(e.clientY, window.innerHeight - menu.offsetHeight) + 'px';
		});
		menu.addEventListener('click', function (e) {
			var li = e.target.closest('.menu > li');
			if (li && chooseItem(li)) close();
		});
		document.addEventListener('pointerdown', function (e) {
			if (!menu.contains(e.target)) close();
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') close();
		});
	}

	/**
	 * Tabs
	 */
	function initTabs(root) {
		var tabs = $$(root, ':scope > .tab-list > .tab');
		var panels = $$(root, ':scope > .tab-panel');

		function select(index, focus) {
			tabs.forEach(function (tab, i) {
				tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
				if (i !== index) tab.classList.remove('active');
				tab.tabIndex = i === index ? 0 : -1;
			});
			panels.forEach(function (panel, i) { panel.hidden = i !== index; });
			if (focus) tabs[index].focus();
			emit(root, 'tab', { index: index, tab: tabs[index] });
		}

		tabs.forEach(function (tab, i) {
			tab.addEventListener('click', function (e) {
				e.preventDefault();
				select(i);
			});
			tab.addEventListener('keydown', function (e) {
				var next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
				if (next === undefined) return;
				e.preventDefault();
				select((next + tabs.length) % tabs.length, true);
			});
		});

		var initial = tabs.findIndex(function (tab) {
			return tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('active');
		});
		if (tabs.length) select(Math.max(0, initial));
	}

	/**
	 * Spinners
	 */
	document.addEventListener('click', function (e) {
		var button = e.target.closest('.spinner-up, .spinner-down');
		var input = button && button.closest('.spinner').querySelector('input');
		if (!input || input.disabled) return;
		if (button.classList.contains('spinner-up')) input.stepUp();
		else input.stepDown();
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
	});

	/**
	 * Drop down lists
	 *
	 * Browsers with customizable selects (appearance: base-select) style the
	 * list in CSS. Everywhere else the native popup is replaced by a
	 * .select-dropdown list. Touch devices keep their native pickers, add
	 * data-native to a select to keep it native anywhere.
	 */
	var dropdown = null;

	function isDropdownSelect(el) {
		return el && el.tagName === 'SELECT' && !el.multiple && !(el.size > 1) && !el.disabled && !el.hasAttribute('data-native');
	}

	function closeDropdown() {
		if (!dropdown) return;
		dropdown.list.remove();
		dropdown = null;
	}

	function highlightDropdown(index) {
		dropdown.index = index;
		dropdown.items.forEach(function (li, i) { li.classList.toggle('active', i === index); });
		if (dropdown.items[index]) dropdown.items[index].scrollIntoView({ block: 'nearest' });
	}

	// next enabled item from index in direction dir, stays put at the ends
	function stepDropdown(items, index, dir) {
		for (var i = index + dir; i >= 0 && i < items.length; i += dir) {
			if (!items[i].option.disabled) return i;
		}
		return index;
	}

	function chooseOption(select, option) {
		if (!option || option.disabled) return;
		if (!option.selected) {
			option.selected = true;
			select.dispatchEvent(new Event('input', { bubbles: true }));
			select.dispatchEvent(new Event('change', { bubbles: true }));
		}
	}

	function openDropdown(select) {
		closeDropdown();

		var list = document.createElement('ul');
		var items = [];
		list.className = 'select-dropdown';
		list.setAttribute('role', 'listbox');

		function addOption(option, indent) {
			var li = document.createElement('li');
			li.setAttribute('role', 'option');
			li.textContent = option.label;
			li.classList.toggle('select-dropdown-indent', indent);
			li.classList.toggle('disabled', option.disabled);
			li.option = option;
			items.push(li);
			list.appendChild(li);
		}

		Array.prototype.forEach.call(select.children, function (child) {
			if (child.tagName === 'OPTGROUP') {
				var label = document.createElement('li');
				label.className = 'select-dropdown-group';
				label.textContent = child.label;
				list.appendChild(label);
				Array.prototype.forEach.call(child.children, function (option) { addOption(option, true); });
			} else if (child.tagName === 'OPTION') {
				addOption(child, false);
			}
		});

		// the list lives in <body>, take the font of the select along
		var style = getComputedStyle(select);
		list.style.fontFamily = style.fontFamily;
		list.style.fontSize = style.fontSize;

		document.body.appendChild(list);

		// below the select, or above when there is more room there
		var rect = select.getBoundingClientRect();
		var below = window.innerHeight - rect.bottom;
		var top = list.offsetHeight > below && rect.top > below ? rect.top - list.offsetHeight : rect.bottom;
		list.style.minWidth = rect.width + 'px';
		list.style.left = (rect.left + window.scrollX) + 'px';
		list.style.top = (top + window.scrollY) + 'px';

		list.addEventListener('mousedown', function (e) { e.preventDefault(); });
		list.addEventListener('mousemove', function (e) {
			var li = e.target.closest('li');
			var index = items.indexOf(li);
			if (index >= 0 && !li.option.disabled && index !== dropdown.index) highlightDropdown(index);
		});
		list.addEventListener('click', function (e) {
			var li = e.target.closest('li');
			if (!li || !li.option || li.option.disabled) return;
			chooseOption(select, li.option);
			closeDropdown();
		});

		dropdown = { select: select, list: list, items: items, index: -1 };
		highlightDropdown(items.findIndex(function (li) { return li.option.selected; }));
	}

	function initDropdowns() {
		var supported = window.CSS && CSS.supports && CSS.supports('appearance', 'base-select');
		var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
		if (supported || touch) return;

		document.addEventListener('mousedown', function (e) {
			var select = e.target.closest && e.target.closest('select');
			if (e.button !== 0 || !isDropdownSelect(select)) return;
			e.preventDefault();
			select.focus();
			if (dropdown && dropdown.select === select) closeDropdown();
			else openDropdown(select);
		}, true);

		document.addEventListener('keydown', function (e) {
			var select = e.target;
			if (!isDropdownSelect(select)) return;

			// closed: the arrows change the value right away, like on Windows
			if (!dropdown || dropdown.select !== select) {
				if (e.key === ' ' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) {
					openDropdown(select);
				} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					var options = Array.prototype.slice.call(select.options).map(function (option) { return { option: option }; });
					var index = stepDropdown(options, select.selectedIndex, e.key === 'ArrowDown' ? 1 : -1);
					chooseOption(select, select.options[index]);
				} else {
					return;
				}
				e.preventDefault();
				return;
			}

			var items = dropdown.items;
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				highlightDropdown(stepDropdown(items, dropdown.index, e.key === 'ArrowDown' ? 1 : -1));
			} else if (e.key === 'Home' || e.key === 'End') {
				highlightDropdown(stepDropdown(items, e.key === 'Home' ? -1 : items.length, e.key === 'Home' ? 1 : -1));
			} else if (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) {
				if (items[dropdown.index]) chooseOption(select, items[dropdown.index].option);
				closeDropdown();
			} else if (e.key === 'Escape') {
				closeDropdown();
			} else if (e.key === 'Tab') {
				closeDropdown();
				return;
			} else {
				return;
			}
			e.preventDefault();
		}, true);

		document.addEventListener('pointerdown', function (e) {
			if (dropdown && !dropdown.list.contains(e.target) && e.target !== dropdown.select) closeDropdown();
		});
		document.addEventListener('focusout', function (e) {
			if (dropdown && e.target === dropdown.select) closeDropdown();
		});
		window.addEventListener('resize', closeDropdown);
		document.addEventListener('scroll', function (e) {
			if (dropdown && !dropdown.list.contains(e.target)) closeDropdown();
		}, true);
	}

	initDropdowns();

	/**
	 * List views & list boxes
	 */
	function initListview(list) {
		var selector = list.querySelector('tbody') ? 'tbody > tr' : ':scope > li';
		var anchor = null;

		list.addEventListener('mousedown', function (e) {
			var item = e.target.closest(selector === 'tbody > tr' ? 'tbody > tr' : 'li');
			if (!item || !list.contains(item) || item.classList.contains('disabled')) return;

			var items = $$(list, selector);
			if (e.shiftKey && anchor) {
				var a = items.indexOf(anchor), b = items.indexOf(item);
				items.forEach(function (it, i) {
					var on = i >= Math.min(a, b) && i <= Math.max(a, b);
					it.classList.toggle('active', on || (e.ctrlKey && it.classList.contains('active')));
				});
			} else if (e.ctrlKey || e.metaKey) {
				item.classList.toggle('active');
				anchor = item;
			} else {
				items.forEach(function (it) { it.classList.toggle('active', it === item); });
				anchor = item;
			}

			items.forEach(function (it) {
				it.classList.toggle('focus', it === item);
				it.setAttribute('aria-selected', it.classList.contains('active') ? 'true' : 'false');
			});
			emit(list, 'select', { items: items.filter(function (it) { return it.classList.contains('active'); }) });
		});
	}

	/**
	 * Windows
	 */
	var zIndex = 10;

	function activateWindow(win) {
		$$(document, '[data-window]').forEach(function (other) {
			other.classList.toggle('window-inactive', other !== win);
		});
		win.style.zIndex = ++zIndex;
	}

	function initWindow(win) {
		win.addEventListener('pointerdown', function () { activateWindow(win); });

		win.addEventListener('click', function (e) {
			var button = e.target.closest('.window-header-controls button');
			if (!button || button.closest('.window') !== win) return;
			var action = ['minimize', 'maximize', 'restore', 'close', 'help'].filter(function (name) {
				return button.classList.contains('window-' + name);
			})[0];

			// listeners can call preventDefault() to stop the default behaviour
			if (!action || !emit(win, action)) return;

			if (action === 'close' || action === 'minimize') {
				win.hidden = true;
			} else if (action === 'maximize' || action === 'restore') {
				win.classList.toggle('window-maximized', action === 'maximize');
				button.classList.toggle('window-maximize', action === 'restore');
				button.classList.toggle('window-restore', action === 'maximize');
			}
		});
	}

	function initDraggable(win) {
		var header = win.querySelector('.window-header');
		if (!header) return;

		header.addEventListener('pointerdown', function (e) {
			if (e.button !== 0 || e.target.closest('button') || win.classList.contains('window-maximized')) return;
			if (getComputedStyle(win).position === 'static') win.style.position = 'relative';

			var startX = e.clientX - (parseFloat(win.style.left) || 0);
			var startY = e.clientY - (parseFloat(win.style.top) || 0);
			header.setPointerCapture(e.pointerId);

			function move(e) {
				win.style.left = (e.clientX - startX) + 'px';
				win.style.top = (e.clientY - startY) + 'px';
			}
			function stop() {
				header.removeEventListener('pointermove', move);
				header.removeEventListener('pointerup', stop);
			}
			header.addEventListener('pointermove', move);
			header.addEventListener('pointerup', stop);
			e.preventDefault();
		});
	}

	/**
	 * Start menu & clock
	 */
	function initStartButton(button) {
		var menu = document.querySelector(button.getAttribute('data-start-button'));
		if (!menu) return;
		initMenuHover(menu.querySelector('.menu') || menu);

		function toggle(show) {
			menu.hidden = !show;
			button.classList.toggle('active', show);
			if (!show) $$(menu, '.open, .active').forEach(function (el) { el.classList.remove('open', 'active'); });
		}

		toggle(button.classList.contains('active'));
		button.addEventListener('click', function () { toggle(menu.hidden); });
		document.addEventListener('pointerdown', function (e) {
			if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) toggle(false);
		});
		menu.addEventListener('click', function (e) {
			var li = e.target.closest('.menu > li');
			if (li && chooseItem(li)) toggle(false);
		});
	}

	function initClock(el) {
		function tick() {
			el.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		}
		tick();
		setInterval(tick, 10000);
	}

	/**
	 * Init
	 */
	function init(root) {
		root = root || document.documentElement;
		each(root, '[data-menubar]', 'Menubar', initMenubar);
		each(root, '[data-contextmenu]', 'Context', initContextMenu);
		each(root, '[data-tabs]', 'Tabs', initTabs);
		each(root, '[data-listview]', 'Listview', initListview);
		each(root, '[data-window]', 'Window', initWindow);
		each(root, '[data-draggable]', 'Draggable', initDraggable);
		each(root, '[data-start-button]', 'Start', initStartButton);
		each(root, '[data-clock]', 'Clock', initClock);
	}

	window.Classic = { init: init };

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
	else init();
})();
