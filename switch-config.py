import os
import re

def switch_config_references(directory, from_config, to_config):
    for root, _, files in os.walk(directory):
        # Check if the current directory is "node_modules" and skip it
        if os.path.basename(root) == "node_modules":
            continue

        relative_path = os.path.relpath(root, start=directory)

        # Determine the relative path prefix based on the directory location
        if relative_path.startswith("commands"):
            relative_prefix = "../"
        elif relative_path.startswith(os.path.join("src", "modules")):
            relative_prefix = "../../"
        else:
            continue  # Skip directories other than bot, commands, and src/modules

        for file in files:
            if file.endswith(".js"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Use regular expressions to find and replace require statements with different formats
                updated_content = re.sub(rf"require\s*\(\s*['\"](?:\.\./)*{re.escape(from_config)}['\"]\)", f"require('{relative_prefix}{to_config}')", content)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(updated_content)

def switch_bot_config(directory, from_config, to_config):
    bot_directory = os.path.join(directory, "./")
    for root, _, files in os.walk(bot_directory):
        for file in files:
            if file.endswith(".js"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Use regular expression to find and replace require statements in the /bot/ directory
                updated_content = re.sub(rf"require\s*\(\s*['\"]{re.escape(from_config)}['\"]\)", f"require('{to_config}')", content)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(updated_content)

if __name__ == "__main__":
    # Set the current script's directory as the directory_path
    directory_path = os.path.dirname(os.path.abspath(__file__))
    from_config_file = "dev_config.json"
    to_config_file = "prod_config.json"

    switch_config_references(directory_path, from_config_file, to_config_file)
    switch_bot_config(directory_path, from_config_file, to_config_file)
    print("Configuration references switched successfully.")
