#!/usr/bin/env python3
"""
九号 ebike API 响应解密脚本
================================
使用方法:
  1. 从九号 App (APK/IPA) 中提取 RSA 私钥
  2. 将私钥粘贴到下方 RSA_KEY 变量
  3. 运行: python3 decrypt.py
"""
import base64
import json
import sys

try:
    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("需要安装 cryptography 库:")
    print("  pip3 install cryptography")
    sys.exit(1)


def fix_base64(s: str) -> bytes:
    """修复 URL-safe base64 编码和 padding"""
    s = s.replace("-", "+").replace("_", "/")
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.b64decode(s)


def decrypt_ninebot(encrypted_s: str, encrypted_r: str, rsa_private_key_pem: str) -> dict:
    """
    解密九号 ebike API 响应

    加密结构: v=101 时
      r = RSA 加密的 AES 密钥 (可能包含 IV)
      s = AES-128-CBC 加密的响应体

    Args:
        encrypted_s: s 字段 (Base64 编码)
        encrypted_r: r 字段 (Base64 编码)
        rsa_private_key_pem: RSA 私钥 (PEM 格式字符串)

    Returns:
        解密后的 JSON dict
    """
    # 1. 解码密文
    r_bytes = fix_base64(encrypted_r)
    s_bytes = fix_base64(encrypted_s)
    print(f"[INFO] r 密文: {len(r_bytes)} 字节 | s 密文: {len(s_bytes)} 字节")

    # 2. 加载 RSA 私钥
    private_key = serialization.load_pem_private_key(
        rsa_private_key_pem.encode(),
        password=None,
        backend=default_backend()
    )
    key_size = private_key.key_size
    print(f"[INFO] RSA 密钥长度: {key_size} bit")

    # 3. RSA 解密 r 字段 → 得到 AES 密钥
    aes_data = None
    for mode_name, padding_mode in [
        ("OAEP-SHA256", asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )),
        ("OAEP-SHA1", asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA1()),
            algorithm=hashes.SHA1(),
            label=None
        )),
        ("PKCS1v15", asym_padding.PKCS1v15()),
    ]:
        try:
            aes_data = private_key.decrypt(r_bytes, padding_mode)
            print(f"[OK] RSA-{mode_name} 解密成功 → {len(aes_data)} 字节")
            break
        except Exception:
            continue

    if aes_data is None:
        raise Exception("RSA 解密失败 - 所有 padding 模式均失败")

    # 4. 提取 AES Key 和 IV
    if len(aes_data) >= 32:
        aes_key = aes_data[:16]
        aes_iv = aes_data[16:32]
        print(f"[INFO] 使用前16字节做Key, 16-32做IV")
    elif len(aes_data) >= 16:
        aes_key = aes_data[:16]
        aes_iv = b'\x00' * 16
        print(f"[INFO] 使用前16字节做Key, 零IV")
    else:
        raise Exception(f"AES 数据太短: {len(aes_data)} 字节")

    print(f"[KEY] AES Key: {aes_key.hex()}")
    print(f"[KEY] AES IV:  {aes_iv.hex()}")

    # 5. AES-128-CBC 解密 s 字段
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.CBC(aes_iv),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    plaintext_padded = decryptor.update(s_bytes) + decryptor.finalize()

    # 6. 去除 PKCS7 padding
    pad_len = plaintext_padded[-1]
    if 1 <= pad_len <= 16:
        plaintext = plaintext_padded[:-pad_len]
    else:
        plaintext = plaintext_padded  # 可能没有 padding

    # 7. 解析 JSON
    result = json.loads(plaintext.decode("utf-8"))
    return result


# ============================================
# 🔧 在这里填入你的数据
# ============================================

# RSA 私钥 (PEM 格式) — 从 App 中提取
RSA_KEY = """-----BEGIN RSA PRIVATE KEY-----
在这里粘贴从九号 App 提取的 RSA 私钥
-----END RSA PRIVATE KEY-----"""

# API 响应数据
S_DATA = "L8LSLWlZYRLF3wyaKn0ljaSBrJ/7cdm68uQffo8bjvA+UbAVVbL4ftptWeIqJmZJcaaXxjrAoPXGh7gURPH4aJZU4K5X5sc2HI4Qt2n5l78u8gy0eSPNOxa3nL2cM1idCBZCQJ683Q8Uwv36U6svSUC9Nc1uqUF+2ISVD4JPgao="
R_DATA = "DzLQxV+OoA4IDNzKcU0qLd0eAsiL74X6s4ZT6pZafhoBWKV08ccxAnnVRYEKXzFO1Hv/SYGYH/VNBeEJFymDLepz1/jzaDgvzaYerW+NQLovr2HMumwyw9ZbbXZCfSCiecekTtISZrdmqsGcSsNMBKDcgySDZJebbW5LqRc0+Vu8NN50at1ZZ5KwJy1MOQNSVzIdIrp+44p3NTWUPOmbxVJZCrRYUZtv0xyc+vw7KebYSL8KvODM9ASYnjUbo4QeSeMHa1blgp/QWhMiQmtN8S8tgpwzlcasbn7tegqE6kEhr0UoHkvip3Kv14J20Ej2Paqzql9CDEvMN+kTkIYaysf6D01HRwPd5S+6KwJ9KDikosiYj/IU7TsnitscDofH0y7WSwZCZaW1/Ty5Mxuaj8AGCCL4qYH6Xc0LfjbU9244WuxE1IJ/4VOQpR/OyKF"


if __name__ == "__main__":
    print("=" * 55)
    print("  九号 ebike API 响应解密工具")
    print("=" * 55)
    print()

    if "在这里粘贴" in RSA_KEY:
        print("❌ 请先填入 RSA 私钥!")
        print()
        print("获取密钥的方法:")
        print("  1. Frida hook: frida -U -n NinebotApp -l hook.js")
        print("  2. 反编译 APK: jadx -d out/ ninebot.apk")
        print("     然后搜索: grep -r 'BEGIN.*PRIVATE' out/")
        print("  3. class-dump IPA: class-dump Ninebot > headers.h")
    else:
        try:
            print("[1/4] 正在 RSA 解密密钥...")
            print("[2/4] 正在提取 AES 密钥...")
            print("[3/4] 正在 AES 解密数据...")
            result = decrypt_ninebot(S_DATA, R_DATA, RSA_KEY)
            print(f"[4/4] 解析 JSON 成功!")
            print()
            print("✅ 解密结果:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"\n❌ 解密失败: {e}")
