import '@hotwired/turbo-rails';
import '../controllers';
import * as ActiveStorage from '@rails/activestorage';
// @ts-ignore
import Rails from '@rails/ujs';
import { initializeIcons } from '../lib/icons';


Rails.start();
ActiveStorage.start();

document.addEventListener('DOMContentLoaded', () => {
  initializeIcons();
});

document.addEventListener('turbo:render', () => {
  initializeIcons();
});
