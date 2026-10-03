// Official pages confirm the university/program names. Course-to-program
// placement below is illustrative and is marked SIMULATED by the seeder.
export const sourceRows = [
  { key:'ptit-program-list', title:'Danh sách chương trình đào tạo PTIT', url:'https://iqa.ptit.edu.vn/2026/04/15/cac-chuong-trinh-dao-tao/' },
  { key:'cntt-program', title:'Chương trình đào tạo ngành Công nghệ thông tin PTIT', url:'https://daotao.ptit.edu.vn/chuong-trinh-dao-tao/nganh-cong-nghe-thong-tin-2025/' },
  { key:'attt-program', title:'Chương trình đào tạo ngành An toàn thông tin PTIT', url:'https://daotao.ptit.edu.vn/chuong-trinh-dao-tao/nganh-an-toan-thong-tin-2025/' },
  { key:'marketing-program', title:'Chương trình đào tạo ngành Marketing PTIT', url:'https://daotao.ptit.edu.vn/chuong-trinh-dao-tao/nganh-marketing-2025/' },
];

const course = (name, semester, credits = 3, type = 'required') => [name, semester, credits, type];

export const programs = [
  {
    key:'ptit-cntt', major:['CNTT','Công nghệ thông tin'], programCode:'7480201', name:'Công nghệ thông tin',
    type:'standard', version:'2025-demo', year:2025, source:'cntt-program',
    courses:[
      course('Hệ điều hành',4), course('Cấu trúc dữ liệu và giải thuật',3),
      course('Cơ sở dữ liệu',4), course('Mạng máy tính',4),
      course('Mật mã học cơ sở',5,3,'elective'),
    ],
  },
  {
    key:'ptit-attt', major:['ATTT','An toàn thông tin'], programCode:'7480202', name:'An toàn thông tin',
    type:'standard', version:'2025-demo', year:2025, source:'attt-program',
    courses:[
      course('Kiểm thử xâm nhập',6), course('Mật mã học cơ sở',4),
      course('Mạng máy tính',3), course('Cơ sở dữ liệu',3,3,'elective'),
    ],
  },
  {
    key:'ptit-marketing', major:['MKT','Marketing'], programCode:'7340115', name:'Marketing',
    type:'standard', version:'2025-demo', year:2025, source:'marketing-program',
    courses:[
      course('Marketing căn bản',2),
      course('Marketing qua phương tiện truyền thông xã hội',5,3,'elective'),
    ],
  },
];

export const topicSeeds = {
  'Hệ điều hành':[
    ['Deadlock','deadlock; Coffman; Banker algorithm; trạng thái an toàn'],
    ['Quản lý bộ nhớ','bộ nhớ ảo; phân trang; working set'],
  ],
  'Cấu trúc dữ liệu và giải thuật':[
    ['Độ phức tạp thuật toán','độ phức tạp; binary search; truy hồi'],
    ['Giải thuật đồ thị','đồ thị; BFS; DFS; đường đi ngắn nhất'],
  ],
  'Cơ sở dữ liệu':[
    ['Chuẩn hóa cơ sở dữ liệu','chuẩn hóa; phụ thuộc hàm; 3NF'],
    ['Giao dịch và đồng thời','ACID; isolation; khóa; MVCC'],
  ],
  'Mạng máy tính':[
    ['Địa chỉ IP và Subnetting','IPv4; subnet; VLSM; CIDR'],
    ['TCP và điều khiển tắc nghẽn','TCP; congestion control; flow control'],
  ],
  'Kiểm thử xâm nhập':[
    ['Báo cáo và khắc phục','pentest; phạm vi; tái hiện; khắc phục'],
    ['An toàn ứng dụng web','OWASP; xác thực; quản lý phiên'],
  ],
  'Mật mã học cơ sở':[
    ['Mật mã đối xứng','AES; khóa bí mật; mã hóa'],
    ['Hàm băm mật mã','hash; digest; HMAC; mật khẩu'],
  ],
  'Marketing căn bản':[
    ['Định vị','định vị; phân khúc; perceptual map'],
    ['Nghiên cứu thị trường','khách hàng; khảo sát; đối thủ'],
  ],
  'Marketing qua phương tiện truyền thông xã hội':[
    ['Chỉ số tương tác','reach; engagement rate; impressions'],
    ['Chiến lược nội dung số','nội dung; chiến dịch; mạng xã hội'],
  ],
};
