import { Application } from "@hotwired/stimulus";

declare global {
  interface Window {
	Stimulus: Application;
  }
}

const application = Application.start();

application.debug = false;
window.Stimulus   = application;

console.log('are you loaded?');
export { application };
