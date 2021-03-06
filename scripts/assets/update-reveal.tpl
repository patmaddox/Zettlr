<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="encoding" content="UTF-8">
  <meta name="generator" content="Zettlr with pandoc">
  <title>$title$</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, minimal-ui">

  <!--
    Immediately initialise the revealJS options so the source Markdown
    file can alter them as necessary.
  -->
  <script type="text/javascript">
    /**************************************************************************
     *                                                                        *
     * These variables can be changed here in the source, but the recommended *
     * way is to alter them inside your source Markdown file for convenience. *
     * Read more at https://docs.zettlr.com/academic/presentations/.          *
     *                                                                        *
     **************************************************************************/
    var zettlrRevealOptions = {
		  // Display controls in the bottom right corner
		  controls: true,
		  // Display a presentation progress bar
		  progress: true,
		  // Display the page number of the current slide
		  slideNumber: true,
		  // Push each slide change to the browser history
		  history: true,
		  // Enable keyboard shortcuts for navigation
		  keyboard: true,
		  // Enable the slide overview mode
		  overview: true,
		  // Vertical centering of slides
		  center: true,
		  // Enables touch navigation on devices with touch input
		  touch: true,
		  // Loop the presentation
		  loop: false,
		  // Change the presentation direction to be RTL
		  rtl: false,
		  // Randomizes the order of slides each time the presentation loads
		  shuffle: false,
		  // Turns fragments on and off globally
		  fragments: true,
		  // Flags if the presentation is running in an embedded mode,
		  // i.e. contained within a limited portion of the screen
		  embedded: false,
	  	// Flags if we should show a help overlay when the questionmark
		  // key is pressed
		  help: true,
		  // Flags if speaker notes should be visible to all viewers
		  showNotes: false,
		  // Global override for autolaying embedded media (video/audio/iframe)
		  // - null: Media will only autoplay if data-autoplay is present
		  // - true: All media will autoplay, regardless of individual setting
		  // - false: No media will autoplay, regardless of individual setting
		  autoPlayMedia: null,
		  // Number of milliseconds between automatically proceeding to the
		  // next slide, disabled when set to 0, this value can be overwritten
		  // by using a data-autoslide attribute on your slides
		  autoSlide: 0,
		  // Stop auto-sliding after user input
		  autoSlideStoppable: true,
		  // Enable slide navigation via mouse wheel
		  mouseWheel: false,
		  // Hides the address bar on mobile devices
		  hideAddressBar: true,
		  // Opens links in an iframe preview overlay
		  previewLinks: false,
		  // Transition style
		  transition: 'convex', // none/fade/slide/convex/concave/zoom
		  // Transition speed
		  transitionSpeed: 'default', // default/fast/slow
		  // Transition style for full page slide backgrounds
		  backgroundTransition: 'fade', // none/fade/slide/convex/concave/zoom
		  // Number of slides away from the current that are visible
		  viewDistance: 3,
		  // The display mode that will be used to show slides
		  display: 'block'
	  };
  </script>

  <!-- Next, include the revealJS-Styles (minified reset.css and reveal.css) -->
	<style type="text/css">$REVEAL_CSS$</style>

  <!-- The chosen theme will be put into this tag. -->
  <style type="text/css">$style$</style>

  <!-- Afterwards we will include the minified revealJS, so that the user
  is able to alter the Reveal-framework itself (and load plugins, etc). -->
  <script type="text/javascript">$REVEAL_JS$</script>
</head>
<body>
	<div class="reveal">
		<div class="slides">
      $body$
		</div>
	</div>
	<script>
    if (!zettlrRevealOptions.autoSlideMethod) {
      // Use this method for navigation when auto-sliding
      zettlrRevealOptions.autoSlideMethod = Reveal.navigateNext
    }
	  Reveal.initialize(zettlrRevealOptions)
	</script>
</body>
</html>
