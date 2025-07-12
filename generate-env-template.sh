#!/bin/sh

# copied from https://github.com/Olusamimaths/.env-to-template

if [ $# -ne 1 ]; then
    echo "Usage: $0 <input_file>"
    exit 1
fi

input_file=$1
output_file="${input_file}.template"

# Check if the input file exists
if [ ! -f "$input_file" ]; then
    echo "Error: File '$input_file' not found."
    exit 1
fi

if [ -f "$output_file" ]; then
    >"$output_file"
fi

# Read each line of the input file and replace values with an empty string
while IFS= read -r -d '' line || [[ -n $line ]]; do
    # Use sed to replace values with empty strings
    # Note: This assumes the .env file has key-value pairs separated by '='
    new_line=$(echo "$line" | sed 's/=.*$/=/')

    # Append the modified line to the output file
    echo "$new_line" >>"$output_file"
done <"$input_file"

echo "Conversion successful. The template file is saved as '$output_file'."
