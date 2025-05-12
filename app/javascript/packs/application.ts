import '@hotwired/turbo-rails';
import '../controllers';
import * as ActiveStorage from '@rails/activestorage';
// @ts-ignore
import Rails from '@rails/ujs';


Rails.start();
ActiveStorage.start();
