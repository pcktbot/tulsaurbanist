import '@hotwired/turbo-rails';
import '../controllers';
const Rails = require('@rails/ujs'); // doesn't work with * import
import * as ActiveStorage from '@rails/activestorage';

Rails.start();
ActiveStorage.start();
