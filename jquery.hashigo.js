jQuery.fn.calc = function() {

    //calc seamlessly handles evaluated formulas or functions 
    //with $valiableElements. It needs to know which though.
    var CalcTypes = {
        FORMULA: 'formula',
        //Formulas are eval'd
        FUNCTION: 'function'
    };

    //formula or function
    var type = '';

    //for use with functions
    var $variableElements = [];

    //user defined functions
    var options = {};

    //the function if there is one
    var funktion = null;

    //the formula if there is one
    var formula = null;

    //determine what type of calculation we have
    if (_(arguments[0]).isString()) {

        //formulas are strings
        type = CalcTypes.FORMULA;
        formula = arguments[0];

        //use options if provided
        options = !!arguments[1] ? arguments[1] : options;

    } else if (_(arguments[0]).isFunction()) {

        type = CalcTypes.FUNCTION;
        funktion = arguments[0];

        if (_(arguments[1]).isArray()) {

            //function has $variableElements
            $variableElements = arguments[1];

            //use options if provided
            options = !!arguments[2] ? arguments[2] : options;
        }
    }

    //a shortcut to our formula tools
    var FT = jQuery.fn.calc.FormulaTool;

    var settings = jQuery.extend(jQuery.fn.calc.settings, options);

    jQuery(this).each(function() {
        var $element = jQuery(this);

        var fw = null;

        switch (type) {
        case CalcTypes.FUNCTION:

            fw = FT.functionWrapper($element, funktion, $variableElements);

            //Assign event handlers on variable elements
            _.each($variableElements, function($variableElement) {
                $variableElement.bind(settings.event, fw);
            });

            break;

        case CalcTypes.FORMULA:

            fw = FT.formulaWrapper($element, formula);

            var selectors = FT.getSelectors(formula);

            //Assign event handlers on variable elements
            jQuery(selectors.join(',')).bind(settings.event, fw);

            break;

        default:
            //Do nothing
            }

        if (settings.triggerOnLoad) {
            fw();
        }
    });

    return jQuery(this);
};

jQuery.fn.calc.settings = {
    event: 'keyup',
    triggerOnLoad: true
};

jQuery.fn.calc.FormulaTool = (function() {
    function getInputValue($element) {

        if ($element.is('input')) {
            var val = $element.val();
            return escape(val);
        }

        var $closestInput = $element.find('input');

        if ($closestInput.length === 0) {
            throw 'DOM Element (id : ' + $element.attr('id') + ', classes : ' + $element.attr('class') + ') is not or does contain a valid input';
        }

        return getInputValue($closestInput);
    }

    function getResolvedFormula(formula) {
        var selectors = getSelectors(formula);

        if (selectors.length === 0) {
            return formula;
        }

        var outputFormula = formula;

        _(selectors).each(function(selector) {
            outputFormula = resolveSelectorAsValue(outputFormula, selector);
        });

        return outputFormula;
    }

    function resolveSelectorAsValue(formula, selector) {
        return formula.replace('${' + selector + '}', '"' + getInputValue(jQuery(selector)) + '"');
    }

    function resolveAndEvalFormula(formula) {
        var js = getResolvedFormula(formula);
        return eval(js);
    }

    function getSelectors(formula) {
        return _(formula.match(/\$\{(.*?)\}/g)).map(function(sigil) {
            return sigil.match(/\$\{(.*?)\}/)[1];
        });
    }

    function setContent($element, content) {
        if ($element.is('input')) {
            $element.val(content);
        } else {
            $element.text(content);
        }
    }

    function formulaWrapper($element, formula) {
        return function() {
            setContent($element, unescape(resolveAndEvalFormula(formula)));
        };
    }

    function functionWrapper($element, funktion, $variableElements) {
        return function() {

            //Map the array of elements to their corresponding values
            var values = _($variableElements).map(function($element) {
                return getInputValue($element);
            });

            //Apply these values as arguments on the supplied funktion    
            setContent($element, unescape(funktion.apply(this, values)));
        };
    }

    return {
        getSelectors: getSelectors,
        resolveAndEvalFormula: resolveAndEvalFormula,
        getResolvedFormula: getResolvedFormula,
        formulaWrapper: formulaWrapper,
        functionWrapper: functionWrapper
    };
})();
