#!/usr/bin/env python3
from PIL import Image, ImageDraw

def add_rounded_corners(input_path, output_path, radius=200):
    # Open the image
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # Create a mask with rounded corners
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)

    # Draw rounded rectangle on mask
    draw.rounded_rectangle([(0, 0), (width, height)], radius=radius, fill=255)

    # Get the existing alpha channel
    if img.mode == 'RGBA':
        alpha = img.split()[3]
        # Combine with rounded corner mask
        from PIL import ImageChops
        new_alpha = ImageChops.multiply(alpha, mask)
    else:
        new_alpha = mask

    # Apply the new alpha channel
    img.putalpha(new_alpha)

    # Save the result
    img.save(output_path, 'PNG')
    print(f"Saved rounded corner image to {output_path}")

if __name__ == "__main__":
    add_rounded_corners('logo_no_background_light.png', 'favicon.png', radius=50)
    add_rounded_corners('logo_no_background_light.png', 'public/favicon.png', radius=50)
