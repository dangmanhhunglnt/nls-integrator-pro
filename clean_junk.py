import os
import shutil

# Danh sách các thư mục hoặc file tạm không cần thiết trong dự án Node.js/React
JUNK_DIRS = ['dist', 'build', '.cache', 'coverage']
JUNK_FILES = ['.DS_Store', 'Thumbs.db', 'npm-debug.log']

def clean_project():
    current_dir = os.getcwd()
    print(f"🧹 Đang quét dọn thư mục: {current_dir}\n")
    
    deleted_dirs = 0
    deleted_files = 0

    # Xóa các thư mục build/cache tạm
    for d in JUNK_DIRS:
        dir_path = os.path.join(current_dir, d)
        if os.path.exists(dir_path):
            try:
                shutil.rmtree(dir_path)
                print(f"[ĐÃ XÓA THƯ MỤC] 📁 {d}/")
                deleted_dirs += 1
            except Exception as e:
                print(f"[LỖI] Không thể xóa thư mục {d}: {e}")

    # Xóa các file rác lẻ tẻ
    for root, dirs, files in os.walk(current_dir):
        # Bỏ qua không quét sâu vào node_modules hoặc .git để đảm bảo an toàn tuyệt đối
        if 'node_modules' in root or '.git' in root:
            continue
            
        for file in files:
            if file in JUNK_FILES or file.endswith('.tmp'):
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                    print(f"[ĐÃ XÓA FILE] 📄 {file}")
                    deleted_files += 1
                except Exception as e:
                    print(f"[LỖI] Không thể xóa file {file}: {e}")

    print("\n-----------------------------------------")
    print(f"✨ Dọn dẹp hoàn tất! Đã xóa {deleted_dirs} thư mục và {deleted_files} file rác.")

if __name__ == "__main__":
    confirm = input("Bạn có chắc chắn muốn dọn dẹp các file/thư mục tạm trong dự án này không? (y/n): ")
    if confirm.lower() == 'y':
        clean_project()
    else:
        print("Đã hủy thao tác.")