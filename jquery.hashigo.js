/*
    TODO: 
      - High Speed e.g.
          $('#speed').calc(delta,[$('#distance'),$('#time')]);
      - jQuery Chaining e.g. 
           $('a').calc('b').hide();
      - Tests, find out a good way too test
      - Code re-organisation, make more logical and modular, jslint
      - Operate on all element types not just inputs
      - Multiple objects become an array of values
            ${.manyElementsWithValues} => [12,13,11,10]
      - Renaissance Stonecutter Scotch Ale
*/

$.fn.calc = function(formula,options){
    
    var FT = $.fn.calc.FormulaTool;
    
	var defaults = {triggerOnLoad:true,
					event:'keyup'};
	
	if	(!!options){				
		$.extend(options,defaults);
	}else{
	    options = defaults;
	}
	
	var $element = $(this);
	
	var selectors = FT.getSelectors(formula);
	
	if (selectors.length === 0) {
		return $(this);
	}

	var fw = FT.formulaWrapper($element,formula);
	
	$(selectors.join(',')).bind(options.event,fw);
	
	if(defaults.triggerOnLoad){
		fw();
	}
	
	return $(this);
}

$.fn.calcHS = function(funktion,$elements,options){
    
    var FT = $.fn.calc.FormulaTool;
    
	var defaults = {triggerOnLoad:true,
					event:'keyup'};
	
	if	(!!options){				
		$.extend(options,defaults);
	}else{
	    options = defaults;
	}
	
	var $element = $(this);
	
	if ($elements.length === 0) {
		return $(this);
	}

	var fw = FT.functionWrapper($element,funktion);
	
	console.log($elements);
	_.each($elements,function($element){$element.bind(options.event,fw)});
	console.log($elements);
	if(defaults.triggerOnLoad){
		fw();
	}
	
	return $(this);
}

$.fn.calc.FormulaTool = (function(){
        function getValueFromInput($element){
    	
		    if ($element.is('input')){
			    var val = $element.val();
    			
			    if (val === ''){
				    return '""';
			    }
    			
			    if (_.isNumber(val)){
				    return parseFloat(val);
			    }
			    if (_.isString(val)){
				    return '"' + escape(val) + '"';
			    }	
    			
			    return '""';
		    }
    		
            var $closestInput = $element.find('input');

            if ($closestInput.length === 0){ 
                throw 'DOM Element (id : ' + $element.attr('id') + ', classes : ' + $element.attr('class') + ') is not or does contain a valid input';
            }

            return getValueFromInput($closestInput);	
	    }
	    
        function replaceSelectorsWithValues(formula){
		    var selectors = getSelectors(formula);
    		
		    if (selectors.length === 0) {
			    return formula;
		    }
    		
		    var outputFormula = formula;
    		
		    _(selectors).each(function(selector){
			    outputFormula = replaceSelectorWithValue(outputFormula,selector);
		    });
    		
		    return outputFormula;
	    }

	    function replaceSelectorWithValue(formula,selector){
		    return formula.replace('${' + selector + '}',getValueFromInput($(selector)));
	    }

	    function evaluateFormula(formula){
		    var js = replaceSelectorsWithValues(formula);
		    return eval(js);
	    }

	    function getSelectors(formula){
		    return _(formula.match(/\$\{(.*?)\}/g)).map(function(sigil){
			    return sigil.match(/\$\{(.*?)\}/)[1];
		    });
	    }
	    
	    function formulaWrapper($element,formula){
		    return function(){
			    if ($element.is('input')){
				    $element.val(evaluateFormula(formula));
			    }else{
				    $element.text(unescape(evaluateFormula(formula)));
			    };
		    }
	    }
	    
	    function functionWrapper($element,funktion,elements){
	        return function(){
	        
	            //Map the array of elements to their corresponding values
	            var values = _(elements).map(function(element){
	                return getValueFromInput($(element));
	            });
	            
	            //Apply these values as arguments on the supplied funktion    
	            if ($element.is('input')){
				    $element.val(funktion.apply(this,values));
			    }else{
				    $element.text(unescape(funktion.apply(this,values)));
			    };
	        } 
	    }
	    
	    return{
	        getSelectors : getSelectors,
	        evaluateFormula : evaluateFormula,
	        evaluateSelectors : replaceSelectorsWithValues,
	        formulaWrapper : formulaWrapper,
	        functionWrapper : functionWrapper 
	    }
})();

