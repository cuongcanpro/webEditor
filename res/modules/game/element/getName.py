import os

folder_path = r"D:\ProjectSea\NewM3\client\GameClientJS\res\high\game\element"

image_names = []

for file in os.listdir(folder_path):
    name, ext = os.path.splitext(file)

    
    if ext.lower() in [".png", ".jpg", ".jpeg"]:
        
        if name.isdigit():
            image_names.append(file)


image_names.sort(key=lambda x: int(os.path.splitext(x)[0]))

print(image_names)
