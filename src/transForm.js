﻿(function (name, definition) {
    if (typeof module != 'undefined') module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
    else {
        var noConflict = this[name];
        this[name] = definition();
        if (noConflict) this[name].noConflict = noConflict;
    }
}('transForm', function () {
    var _defaults = {
        delimiter: '.',
        skipDisabled: true,
        skipFalsy: false,
        useIdOnEmptyName: false,
        triggerChange: false
    };

    /* Serialize */
    function serialize(formEl, options, nodeCallback) {
        var el = makeElement(formEl),
            result = {},
            opts = getOptions(options),
			inputs = getFields(el, opts.skipDisabled),
            skipFalsy = opts.skipFalsy,
			delimiter = opts.delimiter,
            useIdOnEmptyName = opts.useIdOnEmptyName;

        for (var i = 0, l = inputs.length; i < l; i++) {
            var input = inputs[i],
                key = input.name || useIdOnEmptyName && input.id;

            if (!key) continue;

            var entry = null;
            if (nodeCallback) entry = nodeCallback(input);
            if (!entry) entry = getEntryFromInput(input, key);

            if ((skipFalsy && !entry.value || isArray(entry.value) && !entry.value.length)
                || typeof entry.value === 'undefined' || entry.value === null)
                continue;
            saveEntryToResult(result, entry, input, delimiter);
        }
        return result;
    }

    function getEntryFromInput(input, key) {
        var nodeType = input.type && input.type.toLowerCase(),
            entry = { name: key, value: null };

        switch (nodeType) {
            case 'radio':
                if (input.checked) entry.value = input.value === 'on' ? true : input.value;
                break;
            case 'checkbox':
                entry.value = input.checked ? (input.value === 'on' ? true : input.value) : false;
                break;
            case 'select-multiple':
                entry.value = [];
                for (var i = 0, l = input.options.length; i < l; i++)
                    if (input.options[i].selected) entry.value.push(input.options[i].value);
                break;
            default:
                entry.value = input.value;
        }
        return entry;
    }

    function saveEntryToResult(parent, entry, input, delimiter) {
        var name = entry.name,
			arrayPart = /\[\]$/,
			arrayPartIndex = /\[\w*\]/,
			parts = name.split(delimiter);
        //not not accept falsy values in array collections
        if (arrayPart.test(name) && !entry.value) return;

        for (var i = 0, l = parts.length; i < l; i++) {
            var part = parts[i],
				dottedLast = i === l - 1;

            //check if the part is in array notation
            if (arrayPartIndex.test(part)) {
                var split = part.split('['),
                    part = split.shift();

                //Fix this case: name="[begin]"
                if (!part) {
                    part = split.shift().slice(0, -1);

                    if (!split.length) {

                        if (dottedLast)
                            parent[part] = entry.value;
                        else {
                            if (!isObject(parent[part]))
                                parent[part] = {};

                            parent = parent[part];
                        }
                        continue;
                    }
                }

                for (var j = 0, m = split.length; j < m; j++) {
                    var key = split[j].slice(0, -1),
                        bracketLast = j === m - 1;

                    if (!key) {

                        if (!bracketLast || !dottedLast)
                            error('Undefined key is not the last part of the name > ' + name);

                        if (isArray(parent[part]))
                            parent[part].push(entry.value);
                        else
                            parent[part] = [entry.value];

                    } else if (isNumber(key)) {

                        if (!isArray(parent[part]))
                            parent[part] = [];

                        if (bracketLast && dottedLast)
                            parent[part][key] = entry.value;
                        else {

                            if (!isObject(parent[part][key]))
                                parent[part][key] = {};

                            if (bracketLast) {
                                parent = parent[part][key];
                            } else {
                                parent = parent[part];
                                part = key;
                            }
                        }
                    } else {

                        if (!isObject(parent[part]))
                            parent[part] = {};

                        if (bracketLast) {
                            if (dottedLast)
                                parent[part][key] = entry.value;
                            else {
                                if (!isObject(parent[part][key]))
                                    parent[part][key] = {};

                                parent = parent[part][key];
                            }
                        } else {
                            parent = parent[part]
                            part = key;
                        }
                    }
                }
            } else {//normal
                if (dottedLast)
                    parent[part] = entry.value;
                else {
                    if (!isObject(parent[part]))
                        parent[part] = {};

                    parent = parent[part];
                }
            }
        }
    }

    /* Deserialize */
    function deserialize(formEl, data, options, nodeCallback) {
        var el = makeElement(formEl),
            opts = getOptions(options),
            triggerChange = opts.triggerChange,
            inputs = getFields(el, opts.skipDisabled);

        if (!isObject(data)) {
            if (!isString(data)) return;
            try {//Try to parse the passed data as JSON
                data = JSON.parse(data);
            } catch (e) {
                error('Passed string is not a JSON string > ' + data);
            }
        }
        var fieldNames = getFieldNames(data, opts);
        for (var i = 0, l = inputs.length; i < l; i++) {
            var input = inputs[i],
                key = input.name || opts.useIdOnEmptyName && input.id,
				value = fieldNames[key];

            if (typeof value === 'undefined' || value === null) {
                clearInput(input, triggerChange);
                continue;
            }
            var mutated = nodeCallback && nodeCallback(input, value);
            if (!mutated) setValueToInput(input, value, triggerChange);
        }
    }

    function getFieldNames(obj, options) {
        var root = '',
			fieldNames = {};

        function recursion(root, obj) {
            for (var name in obj) {
                var item = obj[name];

                if (isArray(item)) {
                    //if array of objects
                    if (isObject(item[0])) {
                        for (var i = item.length; i--;) {
                            recursion(root + name + '[' + i + '].', item[i]);
                        }
                    } else {
                        //If the user forgets to type "[]" on multiselects
                        fieldNames[root + name] = item;
                        fieldNames[root + name + '[]'] = item;
                    }
                } else if (isObject(item))
                    recursion(root + name + options.delimiter, item);
                else if (obj[name] !== null)
                    fieldNames[root + name] = item;
            }
        }
        recursion(root, obj);
        return fieldNames;
    }

    function setValueToInput(input, value, triggerChange) {
        var nodeType = input.type && input.type.toLowerCase();

        switch (nodeType) {
            case 'radio':
                if (value === input.value) input.checked = true;
                break;
            case 'checkbox':
                input.checked = isArray(value)
                    ? value.indexOf(input.value) !== -1
                    : value === true || value === input.value
                break;
            case 'select-multiple':
                if (isArray(value))
                    for (var i = input.options.length; i--;)
                        input.options[i].selected = value.indexOf(input.options[i].value) !== -1;
                break;
            default:
                input.value = value;
        }
        if (triggerChange)
            triggerEvent(input, 'change');
    }

    /* Clear */
    function clear(formEl, options) {
        var el = makeElement(formEl),
            opts = getOptions(options),
            triggerChange = opts.triggerChange,
            inputs = getFields(el, opts.skipDisabled);

        for (var i = 0, l = inputs.length; i < l; i++)
            clearInput(inputs[i], triggerChange);
    }

    function clearInput(input, triggerChange) {
        var nodeType = input.type && input.type.toLowerCase();

        switch (nodeType) {
            case 'radio':
            case 'checkbox':
                if (input.checked) input.checked = false;
                break;
            case 'select-one':
            case 'select-multiple':
                input.selectedIndex = -1;
                break;
            default:
                input.value = '';
        }
        if (triggerChange)
            triggerEvent(input, 'change');
    }

    /* Submit */
    function submit(formEl, HTML5Submit) {
        var el = makeElement(formEl);

        if (!HTML5Submit) {
            if (isFunction(el.submit))
                el.submit();
            else
                error('The element is not a form element > ' + formEl);
            return;
        }

        var clean, btn = el.querySelector('[type="submit"]');
        if (!btn) {
            clean = true;
            btn = document.createElement('button');
            btn.type = 'submit';
            btn.style.display = 'none';
            el.appendChild(btn);
        }
        triggerEvent(btn, 'click');
        if (clean) el.removeChild(btn);
    }

    /* Helper functions */
    function isObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }
    function isNumber(n) {
        return n - parseFloat(n) + 1 >= 0;
    }
    function isArray(arr) {
        return !!(arr && arr.shift);//If it shifts like an array, its a duck.
    }
    function isFunction(fn) {
        return !!(fn && fn.call);//Ducktyping
    }
    function isString(s) {
        return typeof s === 'string' || s instanceof String;
    }

    function triggerEvent(el, type) {
        var e;
        if (document.createEvent) {
            e = document.createEvent('HTMLEvents');
            e.initEvent(type, true, true);
            el.dispatchEvent(e);
        } else { //old IE
            e = document.createEventObject();
            el.fireEvent('on' + type, e);
        }
    };

    function makeElement(el) {
        var element = isString(el) ? document.querySelector(el) || document.getElementById(el) : el;
        if (!element) error('Element not found with ' + el);
        return element;
    }

    function getFields(parent, skipDisabled) {
        var fieldQuery = skipDisabled
            ? 'input:not([disabled]),select:not([disabled]),textarea:not([disabled])'
            : 'input,select,textarea';
        return parent.querySelectorAll(fieldQuery);
    }

    function getOptions(options) {
        if (!isObject(options)) return _defaults;
        var o, opts = {};
        for (o in _defaults) opts[o] = _defaults[o];
        for (o in options) opts[o] = options[o];
        return opts;
    }

    function setDefaults(defaults) {
        _defaults = getOptions(defaults);
    }

    function error(e) {
        throw new Error('transForm.js ♦ ' + e);
    }

    /* Exposed functions */
    return {
        serialize: serialize,
        deserialize: deserialize,
        clear: clear,
        submit: submit,
        setDefaults: setDefaults
    };
}));