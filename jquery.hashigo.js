/*!
 * jQuery.hashigo.js
 *
 * Requires jQuery 1.4+ (http://jquery.com) 
 * and Underscore.js 1.0+ (http://documentcloud.github.com/underscore/)
 *
 * Copyright 2010, Patrick Te Tau
 * Licensed under the MIT license.
 *
 */

jQuery.fn.calc = function (functionOrFormula, selectorsOrOptions, optionsOrUndefined) {
    //calc seamlessly handles evaluated formulas or functions 
    //with $valiableElements. The arguments will be of different
    //types depending on invocation
    var CalcTypes = {
        FORMULA: 'formula',
        // calc(formula[,options])
        FUNCTION: 'function' // calc(function[,values[], options])
    };

    //formula or function
    var type = '';

    //for use with functions
    var selectors = [];

    //user defined functions
    var options = {};

    //the function if there is one
    var fn = null;

    //the formula if there is one
    var formula = null;

    //determine what type of calculation we have
    if (_(functionOrFormula).isString()) {

        //formulas are strings
        type = CalcTypes.FORMULA;
        formula = functionOrFormula;

        //use options if provided
        options = !! functionOrFormula ? selectorsOrOptions : options;

    } else if (_(functionOrFormula).isFunction()) {

        type = CalcTypes.FUNCTION;
        fn = functionOrFormula;

        if (_(selectorsOrOptions).isArray()) {

            //function has selectors
            selectors = selectorsOrOptions;

            //use options if provided
            options = !! optionsOrUndefined ? optionsOrUndefined : options;
        }
    }

    //functionOrFormula shortcut to our formula tools
    var FT = jQuery.fn.calc.FormulaTool;

    var settings = jQuery.extend({}, jQuery.fn.calc.Settings, options);

    var $this = jQuery(this);

    $this.each(function () {
        var $element = jQuery(this);
        var fw = null;

        switch (type) {
        case CalcTypes.FUNCTION:

            functionBinding($element, fn, settings, selectors);
            break;

        case CalcTypes.FORMULA:

            formulaBinding($element, formula, settings);
            break;

        default:
            //Do nothing
            break;
        }
    });

    function formulaBinding($element, formula, settings) {

        fw = jQuery.fn.calc.FormulaTool.formulaWrapper($element, formula);

        var selectors = jQuery.fn.calc.FormulaTool.getSelectors(formula);
        var $elements = jQuery(selectors.join(','));

        //User has supplied their own bind function
        settings.bindFn($elements, fw);        

        if (settings.triggerOnLoad) {
            fw();
        }
    }

    function functionBinding($element, fn, settings, selectors) {

        fw = jQuery.fn.calc.FormulaTool.functionWrapper($element, fn, selectors);

        //Assign event handlers on variable elements
        //but only assign each handler once!
        _(selectors).chain().uniq().each(function (selector) {
            var $elements = jQuery(selector);            
            //User has supplied their own bind function
            settings.bindFn($elements, fw);
        });

        if (settings.triggerOnLoad) {
            fw();
        }
    }

    return $this;
};


jQuery.fn.calc.Settings = {
    event: 'change',
    triggerOnLoad: true,
    bindFn: function($elements,fw){
        //Assign event handlers on variable elements
        $elements.live(this.event, fw);
    }
};

jQuery.fn.calc.FormulaTool = (function () {

    //Common patterns
    var patterns = {
        selector: new RegExp(/\$\{.*?\}/g),
        innerSelector: new RegExp(/\$\{(.*?)\}/),
        singularSelector: new RegExp(/((\:last)|(\:first)|(\:eq\([0-9]+\))|(\#[a-z][a-z0-9]*))$/)
    };

    //Compile the patterns
    _(patterns).each(function (pattern) {
        new RegExp().compile(pattern);
    });

    function formulaWrapper($element, formula) {
        return function () {
            setContent($element, unescape(evalFormula(formula)));
        };
    }

    function functionWrapper($element, fn, selectorArr) {
        return function () {
            //Map the array of elements to their corresponding values
            var values = _(selectorArr).map(function (selector) {
                return resolveSelector(selector);
            });

            //Apply these values as arguments on the supplied fn     
            setContent($element, unescape(fn.apply(this, values)));
        };
    }

    function resolveSelectors(formula) {
        //split into selectors and parts of the formula
        //that lie between 
        var selectors = getSelectors(formula);
        var parts = formula.split(patterns.selector);

        //two pass selector resolution that avoids 
        //us having to resolve the same selector
        //multiple times:
        //map selectors to their resolved values
        var selectorsToValues = {};
        _(selectors).chain().uniq().map(function (selector) {
            selectorsToValues[selector] = wrapValue(_(resolveSelector(selector)).map(escapeValue));
        });

        //resolve every selector
        var resolvedSelectors = _(selectors).map(function (selector) {
            return selectorsToValues[selector];
        });

        //zip it back together
        return _(parts).chain().zip(resolvedSelectors).flatten().value().join('');
    }

    function resolveSelector(selector) {

        var resolvedSelector = getContents(jQuery(selector));

        if (isPluralSelector(selector)) {
            return resolvedSelector;
        } else {
            return resolvedSelector[0];
        }
    }

    function wrapValue(value) {

        if (_(value).isArray()) {
            return '[' + value + ']';
        } else {
            return value;
        }
    }

    function getContents($elements) {

        var values = _($elements).map(function (element) {
            var $element = jQuery(element);

            var value = null;

            if ($element.is('input') || $element.is('option')) {
                //inputs and selects have values, not text 
                return $element.val();
            } else {
                return $element.text();
            }
        });

        return values;
    }

    function setContent($element, content) {

        if ($element.is('input')) {
            $element.val(content);
        } else {
            $element.text(content);
        }
    }

    function escapeValue(value) {
            //Escaping any user entered strings 
            //as they could be interpreted as code
            //and break the function
            return '"' + escape(value) + '"';
    }

    function evalFormula(formula) {
        var js = resolveSelectors(formula);

        return eval(js);
    }

    function getSelectors(formula) {
        return _(formula.match(patterns.selector)).map(function (sigil) {
            return sigil.match(patterns.innerSelector)[1];
        });
    }

    function isPluralSelector(selector) {
        //Selectors that could return more than
        //one elements are plural selectors e.g. class selectors
        //Conversly selectors that return individual
        //elements are singular selectors, e.g. id selectors
        if (selector.indexOf(",") > 0) {
            //multiple selectors is certainly plural
            return true;
        }

        if (patterns.singularSelector.test(selector) === true) {
            //A selector ending in #id will only return 
            //a singular element 
            //:first, :last, and eq(n) are filters that
            //only ever return one element, therefore
            //they are considered singular
            return false;
        }

        //any other case is currently handled as plural
        return true;
    }

    function tests() {

        fireunit.ok(isPluralSelector('#not, #singular') === true, "',' is always plural");
        fireunit.ok(isPluralSelector('td') === true, "ends with a tag");
        fireunit.ok(isPluralSelector('#this #is #not singular') === true, "ends with a tag");
        fireunit.ok(isPluralSelector('#totally #singular') === false, "ends with an ID");
        fireunit.ok(isPluralSelector('#singular') === false, "ends with an ID");
        fireunit.ok(isPluralSelector('this is #singular') === false, "ends with an ID");
        fireunit.ok(isPluralSelector('this is #singular') === false, "ends with an ID");
        fireunit.ok(isPluralSelector('.this is singular:last') === false, "':last' returns a single element");
        fireunit.ok(isPluralSelector('.this is singular:first') === false, "':first' returns a single element");
        fireunit.ok(isPluralSelector('.this is singular:eq(0)') === false, "'eq()' returns a single element");

        fireunit.testDone();
    }

    return {
        getSelectors: getSelectors,
        formulaWrapper: formulaWrapper,
        functionWrapper: functionWrapper,
        tests: tests
    };
})();
