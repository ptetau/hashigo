jQuery.fn.calc = function(functionOrFormula,elementArrayOrOptions,optionsOrUndefined) {
		
    //calc seamlessly handles evaluated formulas or functions 
    //with $valiableElements. The arguments will be of different
    //types depending on invocation

    var CalcTypes = {
        FORMULA: 'formula', // Arguments = 	calc(formula[,options])
        FUNCTION: 'function'// 				calc(function[,values[], options])
    };

    //formula or function
    var type = '';

    //for use with functions
    var elementsArr = [];

    //user defined functions
    var options = {};

    //the function if there is one
    var funktion = null;

    //the formula if there is one
    var formula = null;

    //determine what type of calculation we have
    if (_(functionOrFormula).isString()) {

        //formulas are strings
        type = CalcTypes.FORMULA;
        formula = functionOrFormula;

        //use options if provided
        options = !!functionOrFormula ? elementArrayOrOptions : options;

    } else if (_(functionOrFormula).isFunction()) {

        type = CalcTypes.FUNCTION;
        funktion = functionOrFormula;

        if (_(elementArrayOrOptions).isArray()) {

            //function has elementsArray
            elementsArr = elementArrayOrOptions;

            //use options if provided
            options = !!optionsOrUndefined ? optionsOrUndefined : options;
        }
    }

    //functionOrFormula shortcut to our formula tools
    var FT = jQuery.fn.calc.FormulaTool;

    var settings = jQuery.extend({},jQuery.fn.calc.Settings, options);

	var $this = jQuery(this);
    
    $this.each(function() {
        var $element = $this;

        var fw = null;

        switch (type) {
        case CalcTypes.FUNCTION:
        		
            fw = FT.functionWrapper($element, funktion, elementsArr);

            //Assign event handlers on variable elements
            _.each(elementsArr, function($element) {
                $element.bind(settings.event, fw);
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
            break;
        }

        if (settings.triggerOnLoad) {
            fw();
        }
    });
	
    return $this;
};

jQuery.fn.calc.Settings = {
    event: 'keyup',
    triggerOnLoad: true
};

jQuery.fn.calc.FormulaTool = (function() {
    function resolve(elements) {
    	
		var values = _(elements).map(function(element){
			var $element = $(element)
			
			var value = null;
			
		    if ($element.is('input') || $element.is('select')) {
		    	//inputs and selects have values, not text 
		        return $element.val();
		    }else{
				return $element.text();
			}
		});
		
		return values;
    }
    
    function replaceSelectors(formula) {
        var selectors = getSelectors(formula);

        if (selectors.length === 0) {
            return formula;
        }

        _(selectors).each(function(selector) {
            formula = replaceSelector(formula, selector);
        });

        return formula;
    }

    function replaceSelector(formula, selector) {
		var values = _(resolve(jQuery(selector))).map(function(value){
			if (value.match(/^[0-9]+$/)){
				//String is functionOrFormula number.
				//convert strings 
				//containing only numbers
				//to floats
				return parseFloat(value);
			}else{
				//Escaping any user entered strings 
				//as they could be interpreted as code
				//and break the function
				return '"' + escape(value) + '"';
			}
		});
		
		//wrap array inside '[]' brackets
		//so that they can evaluated as an array
        return formula.replace('${' + selector + '}', '[' + values + ']');
    }

    function resolveAndEvalFormula(formula) {
        var js = replaceSelectors(formula);
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

    function functionWrapper($element, funktion, elementsArr) {
   
        return function() {
            //Map the array of elements to their corresponding values
            var values = elementsArr.map(function($element) {
                return resolve($element);
            });
            
            //Apply these values as arguments on the supplied funktion    
            setContent($element, unescape(funktion.apply(this, values)));
        };
    }

    return {
        getSelectors: getSelectors,
        resolveAndEvalFormula: resolveAndEvalFormula,
        replaceSelectors: replaceSelectors,
        resolve: resolve,
        formulaWrapper: formulaWrapper,
        functionWrapper: functionWrapper,
        replaceSelector: replaceSelector
    };
})();
