class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :shape_templates, dependent: :destroy
  has_many :redesigns, dependent: :destroy

  validates :username, presence: true, uniqueness: true
end
