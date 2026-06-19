require 'csv'

namespace :incidents do
  DEFAULT_IMPORT_PATH = Rails.root.join('tmp', 'fars_import.csv').to_s

  desc "Import incidents from a FARS CSV file. Defaults to tmp/fars_import.csv. Usage: rake incidents:import_fars[path/to/file.csv]"
  task :import_fars, [:csv_path] => :environment do |_, args|
    path = args[:csv_path] || ENV['CSV_PATH'] || DEFAULT_IMPORT_PATH
    abort "File not found: #{path}" unless File.exist?(path)

    puts "Importing from #{path}"
    imported = 0
    skipped = 0
    errors = []

    CSV.foreach(path, headers: true) do |row|
      year   = row['YEAR'].to_i
      month  = row['MONTH'].to_i
      day    = row['DAY'].to_i
      hour   = row['HOUR'].to_i
      minute = row['MINUTE'].to_i

      hour   = 0 if hour >= 24
      minute = 0 if minute >= 60

      begin
        dt = Time.new(year, month, day, hour, minute, 0)
      rescue ArgumentError
        errors << "Row ST_CASE=#{row['ST_CASE']}: invalid date #{year}-#{month}-#{day}"
        skipped += 1
        next
      end

      road  = row['TWAY_ID'].to_s.strip
      cross = row['TWAY_ID2'].to_s.strip
      cross = nil if cross.downcase == 'null' || cross.empty?
      location = cross ? "#{road} & #{cross}, Tulsa, OK" : "#{road}, Tulsa, OK"

      lat = row['LATITUDE'].to_f
      lng = row['LONGITUDE'].to_f

      incident = Incident.new(
        date_time:              Time.new(year, month, day, hour, minute, 0),
        location_description:   location,
        latitude:               lat.nonzero? ? lat : nil,
        longitude:              lng.nonzero? ? lng : nil,
        fatality_count:         row['FATALS'].to_i,
        pedestrian_count:       row['PERNOTMVIT'].to_i,
        vehicle_occupant_count: row['PERMVIT'].to_i,
        information_source:     "FARS 2024",
        verification_status:    :status_verified
      )

      if incident.save(validate: false)
        imported += 1
      else
        errors << "Row ST_CASE=#{row['ST_CASE']}: #{incident.errors.full_messages.join(', ')}"
        skipped += 1
      end
    end

    puts "Imported: #{imported}"
    puts "Skipped:  #{skipped}"
    errors.each { |e| puts "  ERROR: #{e}" }
  end

  desc "Preview FARS CSV import without writing to the database. Defaults to tmp/fars_import.csv."
  task :preview_fars, [:csv_path] => :environment do |_, args|
    path = args[:csv_path] || ENV['CSV_PATH'] || DEFAULT_IMPORT_PATH
    abort "File not found: #{path}" unless File.exist?(path)

    rows = CSV.read(path, headers: true)
    puts "File: #{path}"
    puts "Total rows: #{rows.size}"
    puts "\nSample (first 5):"
    rows.first(5).each do |row|
      road  = row['TWAY_ID'].to_s.strip
      cross = row['TWAY_ID2'].to_s.strip
      cross = nil if cross.downcase == 'null' || cross.empty?
      loc   = cross ? "#{road} & #{cross}" : road
      puts "  #{row['YEAR']}-#{row['MONTH'].rjust(2,'0')}-#{row['DAY'].rjust(2,'0')} " \
           "#{row['HOUR'].rjust(2,'0')}:#{row['MINUTE'].rjust(2,'0')}  " \
           "#{loc}  fatals=#{row['FATALS']}  lat=#{row['LATITUDE']}  lng=#{row['LONGITUDE']}"
    end
  end
end
