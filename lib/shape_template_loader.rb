class ShapeTemplateLoader
  def self.load_from_yaml
    yaml_path = Rails.root.join('config', 'shape_templates.yml')
    templates = YAML.load_file(yaml_path)

    result = []

    templates.each do |category_key, shapes|
      shapes.each do |shape_key, attributes|
        template_hash = {
          id: "system_#{category_key}_#{shape_key}",
          name: attributes['name'],
          category: attributes['category'],
          width: attributes['width'].to_f,
          depth: attributes['depth']&.to_f,
          color: attributes['color'],
          is_path: attributes['is_path'] || false,
          is_custom: false,
          template_data: attributes.except('name', 'category', 'width', 'depth', 'color', 'is_path')
        }

        result << template_hash
      end
    end

    result
  end

  def self.all_templates(user = nil)
    yaml_templates = load_from_yaml

    if user
      db_templates = user.shape_templates.map do |template|
        {
          id: template.id.to_s,
          name: template.name,
          category: template.category,
          width: template.width,
          depth: template.depth,
          color: template.color,
          is_path: template.is_path,
          is_custom: true,
          template_data: template.template_data
        }
      end

      yaml_templates + db_templates
    else
      yaml_templates
    end
  end

  def self.find_template(template_id, user = nil)
    all_templates(user).find { |t| t[:id].to_s == template_id.to_s }
  end
end
