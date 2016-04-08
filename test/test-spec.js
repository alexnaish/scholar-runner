/*

Possible Spec Options:

name: String that will be the unique identifier within Scholar. Example = "TestHeaderDesktop"
selector: CSS Selector to target specific elements. Example = ".main.header"
path: URL path to target page. Example = "/myTestPage"
loadTimeout: Milliseconds to allow page to stabilise before taking a screenshot (Defaults to 2000). Example = 5000
setup: function that will be evaluated within the browser to allow events to happen after page loads (click on an accordion heading etc). Example = function () {
        $('.faq-question-2').click();
    }
setupTimeout: Milliseconds to allow page to stabilise after running a setup function (Defaults to 0). Example = 2000
windowSize: JS Object with width and height properties. Example = {width: 1280, height: 720}

*/

var desktopSpecs = [
	{
		name: 'broadband-topnav',
		selector: '.topnav',
		path: '/'
	}, {
		name: 'broadband-header',
		selector: '.n-header--blue',
		path: '/'
	}, {
		name: 'broadband-form-container',
		selector: '.postcode-landline-container',
		path: '/'
	}, {
		name: 'broadband-form-error',
		selector: '.postcode-landline-container',
		path: '/',
		setup: function() {
				document.getElementById('landline').className += " error";
				document.getElementsByClassName('n-button')[0].click()
		}
	}
];

var mobileSpecs = [
	{
		name: 'broadband-mobile-topnav',
		selector: '.topnav',
		path: '/',
		windowSize: {width: 480, height: 600}
	}, {
		name: 'broadband-mobile-header',
		selector: '.n-header--blue',
		path: '/',
		windowSize: {width: 480, height: 600}
	}, {
		name: 'broadband-mobile-form-container',
		selector: '.postcode-landline-container',
		path: '/',
		windowSize: {width: 480, height: 600}
	}, {
		name: 'broadband-mobile-form-error',
		selector: '.postcode-landline-container',
		path: '/',
		windowSize: {width: 480, height: 600}
	}
];

module.exports = {
  desktop: desktopSpecs,
  mobile: mobileSpecs,
  all: desktopSpecs.concat(mobileSpecs)
};
