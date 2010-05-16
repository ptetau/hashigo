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
            //but only assign each handler once!
			_(elementsArr).chain().uniq().each(function($element) {
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
			if (/^[0-9]+$/.test(value)){
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
		
    	if(isPluralSelector(selector)){
			//wrap array inside '[]' brackets
			//so that they can evaluated as an array
		    return formula.replace('${' + selector + '}', '[' + values + ']');
	    }else{
	    	//no wrapping
	    	return formula.replace('${' + selector + '}', values[0]);
	    }
    }

    function resolveAndEvalFormula(formula) {
        var js = replaceSelectors(formula);
        return eval(js);
    }

    function getSelectors(formula) {
        return _(formula.match(/\$\{.*?\}/g)).map(function(sigil) {
            return sigil.match(/\$\{(.*?)\}/)[1];
        });
    }
    
    function isPluralSelector(selector){
    	//Selectors that could return more than
    	//one elements are plural selectors e.g. class selectors
    	//Conversly selectors that return individual
    	//elements are singular selectors, e.g. id selectors
    	
    	if (selector.indexOf(",") > 0){
    		//multiple selectors is certainly plural
    		return true;
    	}
		
		var filterPattern = new RegExp(/((\:last)|(\:first)|(\:eq\([0-9]+\))|(\#[a-z][a-z0-9]*))$/)
    	
    	if (filterPattern.test(selector) === true){
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
    
    function tests(){
    	
    	fireunit.ok( isPluralSelector('#not, #singular') === true, "',' is always plural" );
 	    fireunit.ok( isPluralSelector('td') === true, "ends with a tag" );
 	    fireunit.ok( isPluralSelector('#this #is #not singular') === true, "ends with a tag" );
     	fireunit.ok( isPluralSelector('#totally #singular') === false, "ends with an ID" );
     	fireunit.ok( isPluralSelector('#singular') === false, "ends with an ID" );
 	    fireunit.ok( isPluralSelector('this is #singular') === false, "ends with an ID" );
 	    fireunit.ok( isPluralSelector('this is #singular') === false, "ends with an ID" );
 	    fireunit.ok( isPluralSelector('.this is singular:last') === false, "':last' returns a single element" );
 	    fireunit.ok( isPluralSelector('.this is singular:first') === false, "':first' returns a single element" );
        fireunit.ok( isPluralSelector('.this is singular:eq(0)') === false, "'eq()' returns a single element" );
 	    
    	fireunit.testDone();
    }

    return {
        getSelectors: getSelectors,
        formulaWrapper: formulaWrapper,
        functionWrapper: functionWrapper,
        tests: tests
    };
})();
